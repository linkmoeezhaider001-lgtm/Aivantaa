import os
from dotenv import load_dotenv

load_dotenv()

import asyncio
import csv
import io
import logging
import uuid
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

import asyncpg
import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import BaseModel, ConfigDict, Field


logger = logging.getLogger(__name__)
logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))

MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")
SYSTEM_INSTRUCTION = (
    "You are the scheduling coordinator for a MedSpa. A lead has responded to an SMS "
    "check-in. Your sole objective is to book them for a 15-minute phone consultation. "
    "Do not answer technical questions. If they ask about price or details, say: "
    "'Great question, our specialist handles exact pricing based on your situation. "
    "I have a slot tomorrow at 10 AM or 2 PM for a quick call to give you a firm number. "
    "Which works better?'"
)

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
db_pool: asyncpg.Pool | None = None


class WebhookPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    phone_number: str = Field(min_length=1, max_length=64)
    text: str = Field(min_length=1, max_length=10_000)


class WebhookResponse(BaseModel):
    phone_number: str
    response: str


class AuditRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    contact: str = Field(min_length=3, max_length=320)
    source: str = Field(default="unknown", max_length=64)
    csv_text: str | None = Field(default=None, max_length=5_000_000)


class AuditResponse(BaseModel):
    audit_id: str
    status: str
    contact: str
    message: str
    metrics: dict[str, int] | None = None


def required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def create_booking_tool() -> types.Tool:
    return types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="book_appointment",
                description="Book a 15-minute phone consultation for the lead.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "phone_number": types.Schema(
                            type=types.Type.STRING,
                            description="The lead's phone number.",
                        ),
                        "appointment_time": types.Schema(
                            type=types.Type.STRING,
                            description="The requested appointment date and time.",
                        ),
                    },
                    required=["phone_number", "appointment_time"],
                ),
            )
        ]
    )


async def create_pool() -> asyncpg.Pool:
    return await asyncpg.create_pool(
        dsn=required_env("DATABASE_URL"),
        min_size=int(os.environ.get("DB_POOL_MIN_SIZE", "1")),
        max_size=int(os.environ.get("DB_POOL_MAX_SIZE", "10")),
        command_timeout=float(os.environ.get("DB_COMMAND_TIMEOUT_SECONDS", "15")),
        max_inactive_connection_lifetime=300,
    )


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    global db_pool

    required_env("GEMINI_API_KEY")
    db_pool = await create_pool()
    try:
        yield
    finally:
        if db_pool is not None:
            await db_pool.close()
            db_pool = None


app = FastAPI(title="AI SMS Reactivation Webhook", lifespan=lifespan)


def verify_intake_key(authorization: str | None) -> None:
    expected = os.environ.get("REACTIVATION_INTAKE_API_KEY")
    if expected and authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Invalid intake credentials")


@app.post("/v1/audits", response_model=AuditResponse)
async def create_audit(
    payload: AuditRequest,
    authorization: str | None = Header(default=None),
) -> AuditResponse:
    verify_intake_key(authorization)
    audit_id = f"audit_{uuid.uuid4().hex}"
    metrics = None
    if payload.csv_text:
        reader = csv.DictReader(io.StringIO(payload.csv_text))
        rows = list(reader)
        normalized_rows = [
            {str(key).strip().lower(): (value or "").strip() for key, value in row.items()}
            for row in rows
        ]
        metrics = {
            "total_rows": len(normalized_rows),
            "rows_with_phone": sum(
                bool(row.get("phone") or row.get("phone_number") or row.get("mobile"))
                for row in normalized_rows
            ),
            "rows_with_email": sum(
                bool(row.get("email") or row.get("email_address"))
                for row in normalized_rows
            ),
        }
    logger.info("Audit intake received for %s from %s", payload.contact, payload.source)
    return AuditResponse(
        audit_id=audit_id,
        status="queued",
        contact=payload.contact,
        message="Audit intake accepted. Connect a CSV or CRM export to begin analysis.",
        metrics=metrics,
    )


def get_pool() -> asyncpg.Pool:
    if db_pool is None:
        raise RuntimeError("Database pool is not initialized")
    return db_pool


async def load_history(
    phone_number: str,
) -> tuple[int, list[types.Content]]:
    pool = get_pool()
    async with pool.acquire() as connection:
        lead = await connection.fetchrow(
            "SELECT id FROM leads WHERE phone_number = $1",
            phone_number,
        )
        if lead is None:
            return 0, []

        rows = await connection.fetch(
            """
            SELECT role, content
            FROM messages
            WHERE lead_id = $1
            ORDER BY created_at ASC, id ASC
            """,
            lead["id"],
        )

    return (
        int(lead["id"]),
        [
            types.Content(
                role=row["role"],
                parts=[types.Part.from_text(text=row["content"])],
            )
            for row in rows
        ],
    )


async def save_user_message(
    phone_number: str,
    text: str,
    lead_id: int,
) -> int:
    pool = get_pool()
    async with pool.acquire() as connection:
        async with connection.transaction():
            if lead_id:
                await connection.execute(
                    """
                    UPDATE leads
                    SET status = CASE
                        WHEN status = 'pending' THEN 'contacted'
                        ELSE status
                    END
                    WHERE id = $1
                    """,
                    lead_id,
                )
            else:
                lead_id = await connection.fetchval(
                    """
                    INSERT INTO leads (phone_number, status)
                    VALUES ($1, 'contacted')
                    ON CONFLICT (phone_number)
                    DO UPDATE SET status = CASE
                        WHEN leads.status = 'pending' THEN 'contacted'
                        ELSE leads.status
                    END
                    RETURNING id
                    """,
                    phone_number,
                )

            await connection.execute(
                """
                INSERT INTO messages (lead_id, role, content)
                VALUES ($1, 'user', $2)
                """,
                lead_id,
                text,
            )
    return int(lead_id)


async def save_model_message(lead_id: int, response: str) -> None:
    pool = get_pool()
    async with pool.acquire() as connection:
        await connection.execute(
            """
            INSERT INTO messages (lead_id, role, content)
            VALUES ($1, 'model', $2)
            """,
            lead_id,
            response,
        )


async def book_appointment(
    phone_number: str,
    appointment_time: str,
) -> dict[str, str]:
    pool = get_pool()
    async with pool.acquire() as connection:
        updated = await connection.execute(
            """
            UPDATE leads
            SET status = 'booked'
            WHERE phone_number = $1
            """,
            phone_number,
        )

    if updated != "UPDATE 1":
        raise ValueError(f"No lead found for phone number {phone_number}")

    logger.info("Booked appointment for %s at %s", phone_number, appointment_time)
    return {
        "status": "booked",
        "phone_number": phone_number,
        "appointment_time": appointment_time,
    }


async def send_sms(to_number: str, message_body: str) -> None:
    api_key = os.environ.get("TELNYX_API_KEY")
    phone_number = os.environ.get("TELNYX_PHONE_NUMBER")
    if not api_key or not phone_number:
        print(
            "Telnyx SMS not sent: missing TELNYX_API_KEY "
            "or TELNYX_PHONE_NUMBER"
        )
        return

    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            response = await http_client.post(
                "https://api.telnyx.com/v2/messages",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": phone_number,
                    "to": to_number,
                    "text": message_body,
                },
            )
        if response.status_code != 200:
            print(
                f"Telnyx SMS failed ({response.status_code}): "
                f"{response.text}"
            )
    except httpx.HTTPError as exc:
        print(f"Telnyx SMS request failed: {exc}")


def response_text(response: types.GenerateContentResponse) -> str:
    text = response.text
    if isinstance(text, str) and text.strip():
        return text.strip()
    raise ValueError("Gemini returned no usable text")


def get_function_call(
    response: types.GenerateContentResponse,
) -> types.FunctionCall | None:
    for candidate in response.candidates or []:
        for part in candidate.content.parts or []:
            if part.function_call is not None:
                return part.function_call
    return None


async def generate_response(
    history: list[types.Content],
    phone_number: str,
) -> str:
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        tools=[create_booking_tool()],
    )
    response = await asyncio.wait_for(
        asyncio.to_thread(
            client.models.generate_content,
            model=MODEL_NAME,
            contents=history,
            config=config,
        ),
        timeout=120.0,
    )
    function_call = get_function_call(response)
    if function_call is None:
        return response_text(response)

    if function_call.name != "book_appointment":
        raise ValueError(f"Unsupported Gemini function: {function_call.name}")

    args = dict(function_call.args or {})
    requested_phone = args.get("phone_number", phone_number)
    appointment_time = args.get("appointment_time")
    if not isinstance(requested_phone, str) or not requested_phone.strip():
        raise ValueError("book_appointment requires phone_number")
    if not isinstance(appointment_time, str) or not appointment_time.strip():
        raise ValueError("book_appointment requires appointment_time")

    booking_result = await book_appointment(requested_phone, appointment_time)
    model_content = response.candidates[0].content
    history.extend(
        [
            model_content,
            types.Content(
                role="tool",
                parts=[
                    types.Part.from_function_response(
                        name="book_appointment",
                        response=booking_result,
                    )
                ],
            ),
        ]
    )
    final_response = await asyncio.wait_for(
        asyncio.to_thread(
            client.models.generate_content,
            model=MODEL_NAME,
            contents=history,
            config=config,
        ),
        timeout=120.0,
    )
    return response_text(final_response)


@app.post("/webhook", response_model=WebhookResponse)
async def receive_webhook(
    payload: WebhookPayload,
    request: Request,
) -> WebhookResponse:
    del request
    try:
        lead_id, history = await load_history(payload.phone_number)
        lead_id = await save_user_message(
            payload.phone_number,
            payload.text,
            lead_id,
        )
        history.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=payload.text)],
            )
        )
        generated = await generate_response(history, payload.phone_number)
        await save_model_message(lead_id, generated)
        await send_sms(payload.phone_number, generated)
        return WebhookResponse(phone_number=payload.phone_number, response=generated)
    except TimeoutError as exc:
        logger.exception("Gemini request timed out")
        raise HTTPException(status_code=504, detail="Gemini request timed out") from exc
    except (asyncpg.PostgresError, asyncpg.InterfaceError) as exc:
        logger.exception("Database operation failed")
        raise HTTPException(status_code=503, detail="Temporary database failure") from exc
    except ValueError as exc:
        logger.exception("Invalid Gemini response or tool call")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except genai_errors.APIError as exc:
        logger.exception("Gemini API request failed")
        raise HTTPException(
            status_code=502,
            detail=f"Gemini API request failed: {exc}",
        ) from exc
    except Exception as exc:
        logger.exception("Webhook processing failed")
        raise HTTPException(status_code=502, detail="Unable to process message") from exc

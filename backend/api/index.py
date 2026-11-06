import os

import asyncpg
from fastapi import FastAPI, Request
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title="Aivantaa Engine",
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"status": "online", "system": "Aivantaa AI Reactivation Engine"}


@app.post("/webhook")
async def handle_webhook(request: Request) -> dict[str, object]:
    try:
        payload = await request.json()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Request body must be valid JSON") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Request body must be a JSON object")

    phone = payload.get("phone") or payload.get("phone_number") or payload.get("mobile")
    if not isinstance(phone, str) or not phone.strip():
        raise HTTPException(status_code=400, detail="A phone number is required")

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not configured")

    name = payload.get("owner_name") or payload.get("name") or payload.get("practice_name")
    if name is not None and not isinstance(name, str):
        raise HTTPException(status_code=400, detail="Name must be text")

    connection = None
    try:
        connection = await asyncpg.connect(database_url)
        async with connection.transaction():
            result = await connection.execute(
                """
                INSERT INTO leads (client_id, phone_number, name, status)
                VALUES ($1, $2, $3, 'dormant')
                ON CONFLICT (phone_number) DO NOTHING
                """,
                "medspa_demo",
                phone.strip(),
                name.strip() if name else None,
            )
    except (asyncpg.PostgresError, OSError) as exc:
        raise HTTPException(status_code=500, detail="Failed to save lead") from exc
    finally:
        if connection is not None:
            await connection.close()

    return {
        "status": "success",
        "saved": result == "INSERT 0 1",
        "phone_number": phone.strip(),
    }

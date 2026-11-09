import json
import logging
import math
import mimetypes
import os
import re
import shutil
from io import BytesIO
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import asyncpg
import pandas as pd
from appwrite.input_file import InputFile
from crm_router import CRMAdapterError, CRMRouter
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from core.appwrite_client import create_appwrite_services


PERSISTENT_FILE_DIR = Path("/mnt/aivantaa_files")
ALLOWED_EXTENSIONS = {".csv", ".xls", ".xlsx"}
logger = logging.getLogger(__name__)


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


@app.post("/webhook/json")
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

    email = payload.get("email")
    if not isinstance(email, str) or not email.strip():
        raise HTTPException(status_code=400, detail="An email address is required")

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not configured")

    name = payload.get("owner_name") or payload.get("name") or payload.get("practice_name")
    if name is not None and not isinstance(name, str):
        raise HTTPException(status_code=400, detail="Name must be text")

    crm = payload.get("crm") or payload.get("crm_type")
    if crm is not None and not isinstance(crm, str):
        raise HTTPException(status_code=400, detail="CRM must be text")

    connection = None
    try:
        connection = await asyncpg.connect(database_url)
        async with connection.transaction():
            client_id = await connection.fetchval(
                """
                INSERT INTO clients (medspa_name, owner_email, crm_type, file_url)
                VALUES ($1, $2, $3, '')
                RETURNING id
                """,
                payload.get("practice_name") or "Webhook client",
                email.strip(),
                crm.strip() if crm else "Other",
            )
            result = await connection.execute(
                """
                INSERT INTO leads (
                    client_id, email, name, phone, dormant_status, raw_data
                )
                VALUES ($1, $2, $3, $4, 'dormant', '{}'::jsonb)
                ON CONFLICT (client_id, email) DO UPDATE SET
                    name = EXCLUDED.name,
                    phone = EXCLUDED.phone
                """,
                client_id,
                email.strip(),
                name.strip() if name else None,
                phone.strip(),
            )
    except (asyncpg.PostgresError, OSError) as exc:
        raise HTTPException(status_code=500, detail="Failed to save lead") from exc
    finally:
        if connection is not None:
            await connection.close()

    return {
        "status": "success",
        "saved": result in {"INSERT 0 1", "UPDATE 1"},
        "email": email.strip(),
        "phone_number": phone.strip(),
    }


def _json_safe(value: Any) -> Any:
    if value is None:
        return None
    if value is pd.NA:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, float) and math.isnan(value):
        return None
    if hasattr(value, "item"):
        return _json_safe(value.item())
    return value


def _normalize_column_name(column: Any) -> str:
    return re.sub(r"\s+", " ", str(column).strip().lower())


def _read_lead_file(file_path: Path) -> pd.DataFrame:
    suffix = file_path.suffix.lower()
    if suffix == ".csv":
        frame = pd.read_csv(file_path)
    elif suffix in {".xls", ".xlsx"}:
        frame = pd.read_excel(file_path)
    else:
        raise ValueError(f"Unsupported file type: {suffix}")

    frame.columns = [_normalize_column_name(column) for column in frame.columns]
    return frame


def _read_lead_file_from_bytes(file_bytes: bytes, suffix: str) -> pd.DataFrame:
    stream = BytesIO(file_bytes)
    if suffix == ".csv":
        frame = pd.read_csv(stream)
    elif suffix in {".xls", ".xlsx"}:
        frame = pd.read_excel(stream)
    else:
        raise ValueError(f"Unsupported file type: {suffix}")

    frame.columns = [_normalize_column_name(column) for column in frame.columns]
    return frame


async def _save_upload(upload: UploadFile) -> Path:
    original_name = Path(upload.filename or "").name
    suffix = Path(original_name).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise ValueError("file must be a CSV, XLS, or XLSX file")

    safe_stem = re.sub(r"[^A-Za-z0-9._-]+", "_", Path(original_name).stem).strip(
        "._"
    )
    if not safe_stem:
        safe_stem = "lead_export"
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    destination = PERSISTENT_FILE_DIR / f"{timestamp}_{safe_stem}{suffix}"
    PERSISTENT_FILE_DIR.mkdir(parents=True, exist_ok=True)

    try:
        with destination.open("wb") as saved_file:
            shutil.copyfileobj(upload.file, saved_file, length=1024 * 1024)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await upload.close()
    return destination


@app.post("/webhook")
@app.post("/intake")
async def ingest_intake(
    medspa_name: str = Form(...),
    owner_email: str = Form(...),
    crm_type: str = Form(...),
    file: UploadFile = File(...),
) -> dict[str, object]:
    try:
        medspa_name = medspa_name.strip()
        owner_email = owner_email.strip()
        crm_type = crm_type.strip()
        if not medspa_name or not owner_email or not crm_type:
            raise ValueError("medspa_name, owner_email, and crm_type are required")

        filename = Path(file.filename or "leads.csv").name
        suffix = Path(filename).suffix.lower()
        if suffix not in ALLOWED_EXTENSIONS:
            raise ValueError("file must be a CSV, XLS, or XLSX file")

        file_bytes = await file.read()
        if not file_bytes:
            raise ValueError("uploaded file is empty")

        frame = _read_lead_file_from_bytes(file_bytes, suffix)
        config, tables_db, _, storage = create_appwrite_services()
        mime_type = file.content_type or mimetypes.guess_type(filename)[0] or (
            "application/octet-stream"
        )
        stored_file = storage.create_file(
            config.bucket_id,
            "unique()",
            InputFile.from_bytes(file_bytes, filename, mime_type),
        )
        file_id = stored_file.id

        client_row = tables_db.create_row(
            config.database_id,
            config.clients_table_id,
            "unique()",
            {
                "medspa_name": medspa_name,
                "owner_email": owner_email,
                "crm_type": crm_type,
                "file_id": file_id,
            },
        )
        client_id = client_row.id
        lead_rows: list[dict[str, Any]] = []
        for row in frame.to_dict(orient="records"):
            normalized_row = {
                str(key): _json_safe(value) for key, value in row.items()
            }
            name = normalized_row.pop("name", None)
            email = normalized_row.pop("email", None)
            phone = normalized_row.pop("phone", None)
            lead_rows.append(
                {
                    "client_id": client_id,
                    "name": name,
                    "email": email,
                    "phone": phone,
                    "raw_data": json.dumps(normalized_row),
                }
            )

        for lead in lead_rows:
            tables_db.create_row(
                config.database_id,
                config.leads_table_id,
                "unique()",
                lead,
            )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Appwrite ingestion failed")
        raise HTTPException(
            status_code=502,
            detail="Failed to upload the file or create Appwrite rows",
        ) from exc
    finally:
        await file.close()

    return {
        "status": "success",
        "client_id": client_id,
        "file_id": file_id,
        "leads_processed": len(lead_rows),
    }


@app.post("/trigger-campaign/{client_id}")
async def trigger_campaign(client_id: int) -> dict[str, object]:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not configured")

    connection = None
    succeeded = 0
    failures: list[dict[str, object]] = []
    try:
        connection = await asyncpg.connect(database_url)
        client = await connection.fetchrow(
            """
            SELECT crm_type, crm_api_key, crm_webhook_url
            FROM clients
            WHERE id = $1
            """,
            client_id,
        )
        if client is None:
            raise HTTPException(status_code=404, detail="Client not found")

        try:
            router = CRMRouter(
                client["crm_type"],
                api_key=client["crm_api_key"],
                webhook_url=client["crm_webhook_url"],
            )
        except CRMAdapterError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        leads = await connection.fetch(
            """
            SELECT id, client_id, name, phone, email, dormant_status, raw_data
            FROM leads
            WHERE client_id = $1 AND dormant_status = 'dormant'
            ORDER BY id
            """,
            client_id,
        )

        for lead in leads:
            lead_id = lead["id"]
            try:
                await router.send_lead(lead)
                updated = await connection.execute(
                    """
                    UPDATE leads
                    SET dormant_status = 'contacted'
                    WHERE id = $1 AND client_id = $2 AND dormant_status = 'dormant'
                    """,
                    lead_id,
                    client_id,
                )
                if updated != "UPDATE 1":
                    raise CRMAdapterError(
                        f"Lead {lead_id} was not updated after CRM delivery"
                    )
                succeeded += 1
            except CRMAdapterError as exc:
                logger.warning("Campaign delivery failed for lead %s: %s", lead_id, exc)
                failures.append({"lead_id": lead_id, "error": str(exc)})
            except Exception as exc:
                logger.exception("Unexpected campaign failure for lead %s", lead_id)
                failures.append(
                    {"lead_id": lead_id, "error": f"Unexpected delivery error: {exc}"}
                )
    except HTTPException:
        raise
    except (asyncpg.PostgresError, OSError) as exc:
        logger.exception("Campaign trigger failed for client %s", client_id)
        raise HTTPException(
            status_code=500, detail=f"Campaign trigger failed: {exc}"
        ) from exc
    finally:
        if connection is not None:
            await connection.close()

    return {
        "status": "success" if not failures else "partial_failure",
        "client_id": client_id,
        "total_leads": succeeded + len(failures),
        "contacted": succeeded,
        "failed": len(failures),
        "failures": failures,
    }

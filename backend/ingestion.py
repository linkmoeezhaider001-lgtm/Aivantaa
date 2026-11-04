import asyncio
import csv
import os
import re
from pathlib import Path

import asyncpg
from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parent
CSV_PATH = BACKEND_DIR / "leads.csv"
CLIENT_ID = "medspa_demo"
PHONE_FIELDS = ("phone_number", "phone", "mobile", "mobile_number")

load_dotenv(BACKEND_DIR / ".env")


def normalize_phone(value: str) -> str:
    compact = re.sub(r"[\s().-]", "", value.strip())
    if compact.startswith("00"):
        compact = f"+{compact[2:]}"
    elif compact.startswith("+"):
        pass
    elif compact.isdigit() and len(compact) == 10:
        compact = f"+1{compact}"
    elif compact.isdigit() and len(compact) == 11 and compact.startswith("1"):
        compact = f"+{compact}"
    else:
        raise ValueError(f"unsupported phone number format: {value!r}")

    if not re.fullmatch(r"\+[1-9]\d{7,14}", compact):
        raise ValueError(f"phone number is not valid E.164: {value!r}")
    return compact


def get_phone(row: dict[str, str | None], line_number: int) -> str:
    for field in PHONE_FIELDS:
        value = row.get(field)
        if value and value.strip():
            return normalize_phone(value)
    raise ValueError(f"CSV line {line_number} has no phone number")


def get_name(row: dict[str, str | None]) -> str | None:
    first_name = (row.get("first_name") or "").strip()
    last_name = (row.get("last_name") or "").strip()
    full_name = " ".join(part for part in (first_name, last_name) if part)
    return full_name or (row.get("name") or "").strip() or None


async def import_leads() -> int:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required")
    if not CSV_PATH.is_file():
        raise FileNotFoundError(f"Lead CSV not found: {CSV_PATH}")

    pool = await asyncpg.create_pool(dsn=database_url, min_size=1, max_size=5)
    inserted = 0
    try:
        async with pool.acquire() as connection:
            with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as file:
                reader = csv.DictReader(file)
                fieldnames = {
                    field.strip().lower()
                    for field in (reader.fieldnames or [])
                    if field
                }
                if not fieldnames.intersection({"first_name", "name"}):
                    raise ValueError(
                        "CSV must include a first_name or name column"
                    )

                if not fieldnames.intersection(PHONE_FIELDS):
                    raise ValueError(
                        "CSV must include a phone_number, phone, or mobile column"
                    )

                for line_number, source_row in enumerate(reader, start=2):
                    row = {
                        (key.strip().lower() if key else ""): value
                        for key, value in source_row.items()
                    }
                    phone_number = get_phone(row, line_number)
                    result = await connection.execute(
                        """
                        INSERT INTO leads (client_id, phone_number, name, status)
                        VALUES ($1, $2, $3, 'dormant')
                        ON CONFLICT (phone_number) DO NOTHING
                        """,
                        CLIENT_ID,
                        phone_number,
                        get_name(row),
                    )
                    if result == "INSERT 0 1":
                        inserted += 1
    finally:
        await pool.close()
    return inserted


if __name__ == "__main__":
    print(f"Imported {asyncio.run(import_leads())} new lead(s).")

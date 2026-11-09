import os
from dataclasses import dataclass

from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.services.storage import Storage
from appwrite.services.tables_db import TablesDB


@dataclass(frozen=True)
class AppwriteConfig:
    endpoint: str
    project_id: str
    api_key: str
    database_id: str
    bucket_id: str
    clients_table_id: str
    leads_table_id: str


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if not value or not value.strip():
        raise RuntimeError(f"{name} is not configured")
    return value.strip()


def get_appwrite_config() -> AppwriteConfig:
    return AppwriteConfig(
        endpoint=_required_env("APPWRITE_ENDPOINT"),
        project_id=_required_env("APPWRITE_PROJECT_ID"),
        api_key=_required_env("APPWRITE_API_KEY"),
        database_id=_required_env("APPWRITE_DATABASE_ID"),
        bucket_id=_required_env("APPWRITE_BUCKET_ID"),
        clients_table_id=_required_env("APPWRITE_CLIENTS_TABLE_ID"),
        leads_table_id=_required_env("APPWRITE_LEADS_TABLE_ID"),
    )


def create_appwrite_services() -> tuple[AppwriteConfig, TablesDB, Databases, Storage]:
    config = get_appwrite_config()
    client = (
        Client()
        .set_endpoint(config.endpoint)
        .set_project(config.project_id)
        .set_key(config.api_key)
    )
    return (
        config,
        TablesDB(client),
        Databases(client),
        Storage(client),
    )

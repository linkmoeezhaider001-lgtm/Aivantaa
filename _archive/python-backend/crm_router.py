from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Mapping
from typing import Any

import httpx


class CRMAdapterError(RuntimeError):
    """Raised when a CRM rejects or cannot receive a lead."""


class CRMAdapter(ABC):
    def __init__(self, *, timeout: float = 15.0) -> None:
        self.timeout = timeout

    @abstractmethod
    async def send_lead(self, lead: Mapping[str, Any]) -> None:
        """Send one lead to the configured CRM."""


class GoHighLevelAdapter(CRMAdapter):
    endpoint = "https://services.leadconnectorhq.com/conversations/messages"

    def __init__(self, api_key: str, *, timeout: float = 15.0) -> None:
        super().__init__(timeout=timeout)
        if not api_key.strip():
            raise CRMAdapterError("GoHighLevel CRM API key is not configured")
        self.api_key = api_key.strip()

    async def send_lead(self, lead: Mapping[str, Any]) -> None:
        raw_data = lead.get("raw_data") or {}
        if not isinstance(raw_data, Mapping):
            raw_data = {}
        contact_id = (
            raw_data.get("contact_id")
            or raw_data.get("ghl_contact_id")
            or raw_data.get("contactId")
        )
        if not contact_id:
            raise CRMAdapterError(
                f"Lead {lead.get('id')} has no GoHighLevel contact_id"
            )

        message = (
            raw_data.get("message")
            or raw_data.get("outbound_message")
            or "We would love to help you book your next appointment."
        )
        payload = {
            "type": "SMS",
            "contactId": str(contact_id),
            "message": str(message),
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Version": "2021-04-15",
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(self.endpoint, json=payload, headers=headers)
                response.raise_for_status()
            except httpx.HTTPError as exc:
                raise CRMAdapterError(
                    f"GoHighLevel request failed for lead {lead.get('id')}: {exc}"
                ) from exc


class GenericWebhookAdapter(CRMAdapter):
    def __init__(self, webhook_url: str, *, timeout: float = 15.0) -> None:
        super().__init__(timeout=timeout)
        if not webhook_url.strip():
            raise CRMAdapterError("CRM webhook URL is not configured")
        self.webhook_url = webhook_url.strip()

    async def send_lead(self, lead: Mapping[str, Any]) -> None:
        payload = {
            "id": lead.get("id"),
            "client_id": lead.get("client_id"),
            "name": lead.get("name"),
            "phone": lead.get("phone"),
            "email": lead.get("email"),
            "dormant_status": lead.get("dormant_status"),
            "raw_data": lead.get("raw_data") or {},
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(self.webhook_url, json=payload)
                response.raise_for_status()
            except httpx.HTTPError as exc:
                raise CRMAdapterError(
                    f"CRM webhook request failed for lead {lead.get('id')}: {exc}"
                ) from exc


class CRMRouter:
    def __init__(
        self,
        crm_type: str,
        *,
        api_key: str | None = None,
        webhook_url: str | None = None,
        timeout: float = 15.0,
    ) -> None:
        normalized_type = crm_type.strip().lower().replace("-", "").replace("_", "")
        if normalized_type in {"gohighlevel", "ghl"}:
            self.adapter: CRMAdapter = GoHighLevelAdapter(
                api_key or "", timeout=timeout
            )
        elif normalized_type in {
            "customwebhook",
            "genericwebhook",
            "webhook",
            "custom",
        }:
            self.adapter = GenericWebhookAdapter(webhook_url or "", timeout=timeout)
        else:
            raise CRMAdapterError(f"Unsupported CRM type: {crm_type}")

    async def send_lead(self, lead: Mapping[str, Any]) -> None:
        await self.adapter.send_lead(lead)

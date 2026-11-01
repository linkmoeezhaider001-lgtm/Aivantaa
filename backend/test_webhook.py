import asyncio

import httpx


async def test_webhook() -> None:
    url = "http://127.0.0.1:8000/webhook"
    payload = {
        "phone_number": "+923128479271",
        "text": "How much do your treatments cost?",
    }

    print(f"-> Sending message: '{payload['text']}' from {payload['phone_number']}")

    async with httpx.AsyncClient(timeout=150.0) as client:
        try:
            response = await client.post(url, json=payload)
            print(f"\n<- Status Code: {response.status_code}")
            try:
                print(f"<- AI Response JSON:\n{response.json()}")
            except ValueError:
                print(f"<- Raw Response:\n{response.text}")
        except httpx.HTTPError as exc:
            print(f"[ERROR] Request failed: {exc}")


if __name__ == "__main__":
    asyncio.run(test_webhook())

import asyncio

import httpx


async def test_webhook() -> None:
    url = "http://127.0.0.1:8000/webhook"
    form_data = {
        "From": "+13105550000",
        "To": "+13105550199",
        "Body": (
            "Hi, I saw an old email about Lip Fillers. "
            "Do you still have availability this week?"
        ),
    }

    print(f"-> Sending message: '{form_data['Body']}' from {form_data['From']}")

    async with httpx.AsyncClient(timeout=150.0) as client:
        try:
            response = await client.post(url, data=form_data)
            print(f"\n<- Status Code: {response.status_code}")
            try:
                print(f"<- AI Response JSON:\n{response.json()}")
            except ValueError:
                print(f"<- Raw Response:\n{response.text}")
        except httpx.HTTPError as exc:
            print(f"[ERROR] Request failed: {exc}")


if __name__ == "__main__":
    asyncio.run(test_webhook())

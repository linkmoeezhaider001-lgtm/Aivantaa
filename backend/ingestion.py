import csv
import os
import random
import httpx
import asyncio
import asyncpg
from dotenv import load_dotenv

# Load credentials
load_dotenv()
TELNYX_API_KEY = os.environ.get("TELNYX_API_KEY")
FROM_NUMBER = os.environ.get("TELNYX_PHONE_NUMBER")
DATABASE_URL = os.environ.get("DATABASE_URL")

async def ignite_campaign():
    print("Connecting to Neon Postgres...")
    # Connect directly to your Neon database
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        with open("leads.csv", mode="r", encoding="utf-8-sig") as file:
            reader = csv.DictReader(file)
            
            # Use an async HTTP client for the Telnyx request
            async with httpx.AsyncClient() as client:
                for row in reader:
                    name = row.get("Name", "there").strip()
                    to_number = row.get("Phone", "").strip()

                    if not to_number:
                        continue

                    # The Opening Hook
                    message_body = f"Hey {name}, it's Sarah from the clinic. Are you still looking to get that treatment sorted out?"

                    # 1. DATABASE SYNC: Check if lead exists. If not, create them.
                    lead = await conn.fetchrow("SELECT id FROM leads WHERE phone_number = $1", to_number)
                    if not lead:
                        lead_id = await conn.fetchval(
                            "INSERT INTO leads (phone_number, name, status) VALUES ($1, $2, 'contacted') RETURNING id",
                            to_number, name
                        )
                    else:
                        lead_id = lead['id']

                    # 2. DATABASE SYNC: Log the opening hook so Gemini has the memory context
                    await conn.execute(
                        "INSERT INTO messages (lead_id, role, content) VALUES ($1, 'model', $2)",
                        lead_id, message_body
                    )

                    # 3. Fire the SMS via Telnyx
                    headers = {
                        "Authorization": f"Bearer {TELNYX_API_KEY}",
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    }
                    payload = {
                        "from": FROM_NUMBER,
                        "to": to_number,
                        "text": message_body
                    }

                    try:
                        response = await client.post(
                            "https://api.telnyx.com/v2/messages",
                            headers=headers,
                            json=payload,
                            timeout=10.0
                        )
                        
                        if response.status_code == 200:
                            print(f"[SUCCESS] Hook sent & logged to DB for {name} at {to_number}")
                        else:
                            print(f"[FAILED] {to_number} - Error: {response.text}")
                            
                    except Exception as e:
                        print(f"[ERROR] Could not send to {to_number}: {str(e)}")

                    # Randomized throttle (12 to 45 seconds) to mimic human texting
                    throttle = random.uniform(12.0, 45.0)
                    print(f"Sleeping for {round(throttle, 1)} seconds...\n")
                    await asyncio.sleep(throttle)

    except FileNotFoundError:
        print("Error: 'leads.csv' not found. Please create the file with 'Name' and 'Phone' columns.")
    finally:
        # Safely close the database connection
        await conn.close()

if __name__ == "__main__":
    print("Initiating Reactivation Sequence...")
    asyncio.run(ignite_campaign())
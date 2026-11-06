from fastapi import FastAPI, Request
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
    payload = await request.json()
    return {"status": "success", "received": payload}

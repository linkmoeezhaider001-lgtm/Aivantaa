import { NextResponse } from "next/server";

const engineUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
const engineApiKey = process.env.REACTIVATION_ENGINE_API_KEY;

export async function POST(request) {
  if (!engineUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_BACKEND_URL is not configured" },
      { status: 503 },
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request" }, { status: 400 });
  }

  if (
    typeof payload?.contact !== "string" ||
    payload.contact.trim().length < 3
  ) {
    return NextResponse.json(
      { error: "A valid domain or email is required" },
      { status: 400 },
    );
  }

  if (payload.csvText !== undefined && typeof payload.csvText !== "string") {
    return NextResponse.json({ error: "CSV content must be text" }, { status: 400 });
  }

  if (typeof payload.csvText === "string" && payload.csvText.length > 5_000_000) {
    return NextResponse.json({ error: "CSV file must be smaller than 5 MB" }, { status: 413 });
  }

  try {
    const response = await fetch(`${engineUrl.replace(/\/$/, "")}/v1/audits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(engineApiKey
          ? { Authorization: `Bearer ${engineApiKey}` }
          : {}),
      },
      body: JSON.stringify({
        contact: payload.contact.trim(),
        source: "reactivation-engine-landing-page",
        ...(payload.csvText ? { csv_text: payload.csvText } : {}),
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Audit intake request failed", error);
    return NextResponse.json(
      { error: "Unable to reach the reactivation engine" },
      { status: 502 },
    );
  }
}

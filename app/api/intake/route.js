import { NextResponse } from "next/server";

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid intake payload" }, { status: 400 });
  }

  const backendUrl = process.env.REACTIVATION_ENGINE_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) {
    return NextResponse.json({ error: "Backend URL is not configured" }, { status: 503 });
  }

  try {
    const response = await fetch(`${backendUrl.replace(/\/$/, "")}/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Backend is unavailable" }, { status: 502 });
  }
}

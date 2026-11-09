import { NextResponse } from "next/server";

export async function POST(request) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid intake payload" }, { status: 400 });
  }

  const backendUrl = process.env.REACTIVATION_ENGINE_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) {
    return NextResponse.json({ error: "Backend URL is not configured" }, { status: 503 });
  }

  try {
    const response = await fetch(`${backendUrl.replace(/\/$/, "")}/intake`, {
      method: "POST",
      body: formData,
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Backend is unavailable" }, { status: 502 });
  }
}

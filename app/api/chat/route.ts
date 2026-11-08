import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

const systemPrompt =
  "You are the official support assistant for Aivantaa, an AI-powered lead reactivation agency for MedSpas. Your goal is to explain how we connect to CRMs (like GoHighLevel), process dormant CSV lead lists, and use AI to text and reactivate old patients into booked appointments. Keep answers concise, professional, and conversion-focused.";

export async function POST(request: Request) {
  const body: unknown = await request.json();

  if (
    !body ||
    typeof body !== "object" ||
    !("messages" in body) ||
    !Array.isArray(body.messages)
  ) {
    return Response.json(
      { error: "A messages array is required." },
      { status: 400 },
    );
  }

  const result = await streamText({
    model: anthropic("claude-3-5-sonnet-20241022"),
    system: systemPrompt,
    messages: body.messages,
  });

  return result.toDataStreamResponse();
}

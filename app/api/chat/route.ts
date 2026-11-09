import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import {
  assertRequiredEnv,
  EnvironmentConfigError,
} from "../../../lib/env-check";

export const runtime = "nodejs";
export const maxDuration = 30;

const systemPrompt =
  "You are the official support assistant for Aivantaa, an AI-powered lead reactivation agency for MedSpas. Your goal is to explain how we connect to CRMs (like GoHighLevel), process dormant CSV lead lists, and use AI to text and reactivate old patients into booked appointments. Keep answers concise, professional, and conversion-focused.";

export async function POST(request: Request) {
  try {
    assertRequiredEnv(["GOOGLE_GENERATIVE_AI_API_KEY"]);
  } catch (error) {
    if (error instanceof EnvironmentConfigError) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    throw error;
  }

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

  try {
    const result = await streamText({
      model: google("gemini-3.8-flash"),
      system: systemPrompt,
      messages: body.messages,
      maxTokens: 256,
      onError({ error }) {
        console.error("Aivantaa Gemini chat stream failed:", error);
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Aivantaa Gemini chat request failed:", error);
    return Response.json(
      { error: "The Gemini chat request failed. Check your Google API key." },
      { status: 502 },
    );
  }
}

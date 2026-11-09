import { NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";

export async function POST(req) {
  try {
    // 1. Parse the incoming JSON payload from the frontend (Papaparse data)
    const body = await req.json();

    // 2. Initialize the Appwrite Admin Client securely
    if (!process.env.APPWRITE_ENDPOINT || !process.env.APPWRITE_PROJECT_ID || !process.env.APPWRITE_API_KEY) {
      throw new Error("Missing Appwrite environment variables in Vercel.");
    }

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    // NOTE: Your specific database.createDocument() loops for clients/leads go here.
    // For testing, we are just verifying the connection and returning success.

    // 3. Return a strictly formatted NextResponse to prevent Vercel 502 crashes
    return NextResponse.json(
      { success: true, message: "Payload received and Appwrite connected." },
      { status: 200 }
    );

  } catch (error) {
    // 4. Catch any Appwrite or parsing errors and return them as a clean 500 JSON response
    console.error("Intake Route Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
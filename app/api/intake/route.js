import { NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";
import Papa from "papaparse";

export async function POST(req) {
  try {
    // 1. Read the incoming FormData instead of req.json()
    const formData = await req.formData();
    
    // 2. Extract the file (assuming the frontend appends it as 'file')
    const file = formData.get("file");
    if (!file) {
      throw new Error("No file received. Check if the frontend uses 'file' in formData.append()");
    }

    // 3. Read the file text and parse the CSV
    const fileText = await file.text();
    const parsedCsv = Papa.parse(fileText, { 
      header: true, 
      skipEmptyLines: true 
    });
    
    const records = parsedCsv.data;

    // 4. Connect to Appwrite securely
    if (!process.env.APPWRITE_ENDPOINT || !process.env.APPWRITE_PROJECT_ID || !process.env.APPWRITE_API_KEY) {
      throw new Error("Missing Appwrite environment variables.");
    }

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    // 5. Send back a success response showing we parsed it correctly
    return NextResponse.json(
      { 
        success: true, 
        message: `Successfully parsed ${records.length} rows!`, 
        sample: records[0] 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Intake Route Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
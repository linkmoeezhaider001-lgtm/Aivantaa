import { NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";

export async function POST(req) {
  try {
    const { records } = await req.json();

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ success: false, error: "Invalid payload format" }, { status: 400 });
    }

    if (!process.env.APPWRITE_ENDPOINT || !process.env.APPWRITE_API_KEY || !process.env.APPWRITE_PROJECT_ID) {
      throw new Error("Missing Appwrite connection environment variables.");
    }

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    // Adjusted to match your specific custom environment variables
    const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
    const COLLECTION_ID = process.env.APPWRITE_LEADS_TABLE_ID;

    if (!DATABASE_ID || !COLLECTION_ID) {
      throw new Error("Missing Database ID or Leads Table ID environment variables.");
    }

    // Insert the batch of records concurrently
    const insertPromises = records.map((record) => {
      return databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        {
          Name: record.Name,
          Email: record.Email,
          Phone: record.Phone,
          CRM: record.CRM,
          average_ltv: record.average_ltv,
          dormant_leads_count: record.dormant_leads_count,
          metadata: record.metadata
        }
      );
    });

    const results = await Promise.all(insertPromises);

    return NextResponse.json(
      { success: true, message: `Batch of ${results.length} leads inserted` },
      { status: 200 }
    );

  } catch (error) {
    console.error("Intake Route Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Server Error" },
      { status: 500 }
    );
  }
}
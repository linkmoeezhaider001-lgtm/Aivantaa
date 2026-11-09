import { NextResponse } from "next/server";
import { Client, Databases, Storage, ID } from "node-appwrite";
import Papa from "papaparse"; // Make sure you have papaparse installed: npm install papaparse

// Initialize the Appwrite Client
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY); // Make sure you have your secret API key in your .env

const databases = new Databases(client);
const storage = new Storage(client);

export async function POST(req) {
  try {
    // 1. Extract the data from the incoming request
    const formData = await req.formData();
    const medspa_name = formData.get("medspa_name");
    const owner_email = formData.get("owner_email");
    const crm_type = formData.get("crm_type");
    const file = formData.get("file");

    if (!file || !medspa_name || !owner_email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 2. Pull Appwrite IDs from your exact environment variables
    const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
    const CLIENTS_TABLE_ID = process.env.APPWRITE_CLIENTS_TABLE_ID;
    const LEADS_TABLE_ID = process.env.APPWRITE_LEADS_TABLE_ID;
    const FILES_BUCKET_ID = process.env.APPWRITE_FILES_BUCKET_ID;

    // 3. (Optional but recommended) Upload the file to Appwrite Storage first
    // Converting the file to a Buffer/File object that Node SDK accepts
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const uploadedFile = await storage.createFile(
      FILES_BUCKET_ID,
      ID.unique(),
      new File([buffer], file.name)
    );

    // 4. Parse the CSV file text content
    const fileText = await file.text();
    const parsedCsv = Papa.parse(fileText, {
      header: true,
      skipEmptyLines: true,
    });
    const records = parsedCsv.data;

    // 5. Create the MedSpa Client record in your Clients table
    const newClient = await databases.createDocument(
      DATABASE_ID,
      CLIENTS_TABLE_ID,
      ID.unique(),
      {
        Name: medspa_name,
        Email: owner_email,
        CRM: crm_type || "None",
        FileId: uploadedFile.$id // Linking the stored file if you have a field for it
      }
    );

    // 6. Create the Lead records in your Leads table, linking each to the Client
      // Extract core fields and bundle the rest into metadata
    const insertPromises = records.map((record) => {
      const { Name, Email, Phone, CRM, average_ltv, dormant_leads_count, ...extraFields } = record;

      return databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        {
          Name: Name || "",
          Email: Email || "",
          Phone: Phone || "",
          CRM: CRM || "",
          average_ltv: parseFloat(average_ltv) || 0,
          dormant_leads_count: parseInt(dormant_leads_count, 10) || 0,
          metadata: JSON.stringify(extraFields || {})
        }
      );
    });

    // Wait for all lead insertions to finish concurrently
    await Promise.all(insertPromises);

    // 7. Return success response
    return NextResponse.json(
      { message: `Successfully added client and ${records.length} leads.` },
      { status: 200 }
    );

  } catch (error) {
    console.error("Intake Error:", error);
    return NextResponse.json(
      { error: "Failed to process intake", details: error.message },
      { status: 500 }
    );
  }
}
import { Client, ID, Storage, TablesDB } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { NextResponse } from "next/server";
import {
  assertRequiredEnv,
  EnvironmentConfigError,
  requiredEnv,
} from "../../../lib/env-check";

export const runtime = "nodejs";

function appwriteServices() {
  assertRequiredEnv([
    "APPWRITE_ENDPOINT",
    "APPWRITE_PROJECT_ID",
    "APPWRITE_API_KEY",
    "APPWRITE_DATABASE_ID",
    "APPWRITE_FILES_BUCKET_ID",
    "APPWRITE_CLIENTS_TABLE_ID",
    "APPWRITE_LEADS_TABLE_ID",
  ]);
  const client = new Client()
    .setEndpoint(requiredEnv("APPWRITE_ENDPOINT"))
    .setProject(requiredEnv("APPWRITE_PROJECT_ID"))
    .setKey(requiredEnv("APPWRITE_API_KEY"));

  return {
    storage: new Storage(client),
    tablesDB: new TablesDB(client),
    databaseId: requiredEnv("APPWRITE_DATABASE_ID"),
    bucketId: requiredEnv("APPWRITE_FILES_BUCKET_ID"),
    clientsTableId: requiredEnv("APPWRITE_CLIENTS_TABLE_ID"),
    leadsTableId: requiredEnv("APPWRITE_LEADS_TABLE_ID"),
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const medspaName = String(formData.get("medspa_name") || "").trim();
    const ownerEmail = String(formData.get("owner_email") || "").trim();
    const ghlApiKey = String(formData.get("ghl_api_key") || "").trim();
    const leadsJson = String(formData.get("leads") || "");
    const upload = formData.get("file");

    if (!medspaName || !ownerEmail || !ghlApiKey || !leadsJson) {
      return NextResponse.json(
        { error: "medspa_name, owner_email, ghl_api_key, and leads are required." },
        { status: 400 },
      );
    }
    if (!(upload instanceof File)) {
      return NextResponse.json({ error: "A CSV file is required." }, { status: 400 });
    }

    const leads = JSON.parse(leadsJson) as Array<{
      name: string | null;
      email: string | null;
      phone: string | null;
      raw_data: Record<string, unknown>;
    }>;
    if (!Array.isArray(leads)) {
      throw new Error("leads must be a JSON array");
    }

    const services = appwriteServices();
    const file = await services.storage.createFile(
      services.bucketId,
      ID.unique(),
      InputFile.fromBuffer(Buffer.from(await upload.arrayBuffer()), upload.name),
    );
    const clientRow = await services.tablesDB.createRow(
      services.databaseId,
      services.clientsTableId,
      ID.unique(),
      {
        medspa_name: medspaName,
        owner_email: ownerEmail,
        ghl_api_key: ghlApiKey,
        file_id: file.$id,
      },
    );

    try {
      await Promise.all(
        leads.map((lead) =>
          services.tablesDB.createRow(
            services.databaseId,
            services.leadsTableId,
            ID.unique(),
            {
              client_id: clientRow.$id,
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              raw_data: JSON.stringify(lead.raw_data || {}),
              status: "pending",
            },
          ),
        ),
      );
    } catch (error) {
      console.error("Appwrite lead row insertion failed:", error);
      throw error;
    }

    return NextResponse.json({
      status: "success",
      client_id: clientRow.$id,
      file_id: file.$id,
      leads_processed: leads.length,
    });
  } catch (error) {
    console.error("Appwrite ingestion failed:", error);
    if (error instanceof EnvironmentConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lead ingestion failed." },
      { status: 500 },
    );
  }
}

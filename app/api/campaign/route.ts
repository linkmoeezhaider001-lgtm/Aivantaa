import { Client, Query, TablesDB } from "node-appwrite";
import { NextResponse } from "next/server";
import {
  assertRequiredEnv,
  EnvironmentConfigError,
  requiredEnv,
} from "../../../lib/env-check";

export const runtime = "nodejs";

function getServices() {
  assertRequiredEnv([
    "APPWRITE_ENDPOINT",
    "APPWRITE_PROJECT_ID",
    "APPWRITE_API_KEY",
    "APPWRITE_DATABASE_ID",
    "APPWRITE_CLIENTS_TABLE_ID",
    "APPWRITE_LEADS_TABLE_ID",
  ]);

  const client = new Client()
    .setEndpoint(requiredEnv("APPWRITE_ENDPOINT"))
    .setProject(requiredEnv("APPWRITE_PROJECT_ID"))
    .setKey(requiredEnv("APPWRITE_API_KEY"));

  return {
    tablesDB: new TablesDB(client),
    databaseId: requiredEnv("APPWRITE_DATABASE_ID"),
    clientsTableId: requiredEnv("APPWRITE_CLIENTS_TABLE_ID"),
    leadsTableId: requiredEnv("APPWRITE_LEADS_TABLE_ID"),
  };
}

type CampaignBody = {
  client_id?: string;
  message_template?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CampaignBody;
    const clientId = body.client_id?.trim();
    const messageTemplate = body.message_template?.trim();

    if (!clientId || !messageTemplate) {
      return NextResponse.json(
        { error: "client_id and message_template are required." },
        { status: 400 },
      );
    }

    const services = getServices();
    const clientRow = await services.tablesDB.getRow(
      services.databaseId,
      services.clientsTableId,
      clientId,
    );
    const clientData = clientRow as typeof clientRow & { ghl_api_key?: string };

    if (!clientData.ghl_api_key) {
      return NextResponse.json(
        { error: "No GoHighLevel API key is configured for this client." },
        { status: 422 },
      );
    }

    const leadRows = await services.tablesDB.listRows(
      services.databaseId,
      services.leadsTableId,
      [Query.equal("client_id", clientId), Query.equal("status", "pending")],
    );

    const results = await Promise.allSettled(
      leadRows.rows.map(async (lead) => {
        try {
          const leadData = lead as typeof lead & { phone?: string };
          if (!leadData.phone) {
            throw new Error(`Lead ${lead.$id} has no phone number`);
          }

          const response = await fetch(
            "https://services.leadconnectorhq.com/conversations/messages",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${clientData.ghl_api_key}`,
                "Content-Type": "application/json",
                Version: "2021-04-15",
              },
              body: JSON.stringify({
                type: "SMS",
                phone: leadData.phone,
                message: messageTemplate,
              }),
            },
          );

          if (!response.ok) {
            const responseBody = await response.text();
            throw new Error(
              `GHL returned ${response.status} for lead ${lead.$id}: ${responseBody.slice(0, 300)}`,
            );
          }

          await services.tablesDB.updateRow(
            services.databaseId,
            services.leadsTableId,
            lead.$id,
            { status: "contacted" },
          );
          return lead.$id;
        } catch (error) {
          console.error(`GHL dispatch failed for lead ${lead.$id}:`, error);
          throw error;
        }
      }),
    );

    const sent = results.filter(
      (result): result is PromiseFulfilledResult<string> =>
        result.status === "fulfilled",
    ).length;

    return NextResponse.json({
      status: sent === results.length ? "success" : "partial_failure",
      total: results.length,
      contacted: sent,
      failed: results.length - sent,
      results: results.map((result) =>
        result.status === "fulfilled"
          ? { status: "fulfilled", lead_id: result.value }
          : { status: "rejected", reason: String(result.reason) },
      ),
    });
  } catch (error) {
    console.error("Campaign dispatch failed:", error);
    if (error instanceof EnvironmentConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Campaign dispatch failed.",
      },
      { status: 500 },
    );
  }
}

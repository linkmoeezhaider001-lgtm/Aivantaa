# Aivantaa

AI-powered MedSpa lead reactivation using Next.js, Appwrite TablesDB/Storage,
Google Gemini, and GoHighLevel (GHL).

## Architecture

- Next.js App Router provides the website and serverless API routes.
- Appwrite Storage holds uploaded lead files.
- Appwrite TablesDB stores `clients` and `leads` rows.
- `components/CsvUploader.tsx` parses CSV files in the browser with PapaParse.
- `/api/ingest` creates the Appwrite file, client row, and pending lead rows.
- `/api/campaign` dispatches pending leads to GHL SMS and marks successful rows
  as contacted.
- `/api/chat` provides the support chatbot through Google Gemini.

## Requirements

- Node.js 20+
- An Appwrite project with a Storage bucket and TablesDB database containing
  `clients` and `leads` tables.
- Google Gemini API key for the chatbot.
- A GoHighLevel API key for campaign dispatch.

## Environment

Copy `.env.example` to `.env.local` and set:

```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=
APPWRITE_FILES_BUCKET_ID=
APPWRITE_CLIENTS_TABLE_ID=clients
APPWRITE_LEADS_TABLE_ID=leads
GOOGLE_GENERATIVE_AI_API_KEY=
```

Never commit `.env.local` or any file containing credentials.

## Run locally

```powershell
npm install
npm run dev
```

The site runs at `http://localhost:3000`.

## API endpoints

### `POST /api/ingest`

Accepts `multipart/form-data` containing:

- `medspa_name`
- `owner_email`
- `ghl_api_key`
- `file` (CSV)
- `leads` (the PapaParse-generated JSON array)

### `POST /api/campaign`

Accepts JSON:

```json
{
  "client_id": "appwrite-client-row-id",
  "message_template": "Hi {{name}}, we have availability this week."
}
```

The route sends pending leads to GHL and updates successful rows to
`status: "contacted"`.

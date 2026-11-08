CREATE TABLE IF NOT EXISTS clients (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    medspa_name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    crm_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS crm_api_key VARCHAR;

ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS crm_webhook_url TEXT;

CREATE TABLE IF NOT EXISTS leads (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    client_id BIGINT NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
    name TEXT,
    phone TEXT,
    email TEXT,
    dormant_status TEXT NOT NULL DEFAULT 'dormant',
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS leads_client_email_unique
    ON leads (client_id, email);

CREATE TABLE IF NOT EXISTS messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'model')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_lead_created_at_idx
    ON messages (lead_id, created_at, id);

CREATE TABLE IF NOT EXISTS chat_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone_number TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_logs_phone_created_at_idx
    ON chat_logs (phone_number, created_at);

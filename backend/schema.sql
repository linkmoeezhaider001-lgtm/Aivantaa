CREATE TABLE IF NOT EXISTS leads (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    client_id TEXT NOT NULL DEFAULT 'medspa_demo',
    phone_number TEXT NOT NULL UNIQUE,
    name TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'dormant', 'contacted', 'booked', 'dead')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS client_id TEXT NOT NULL DEFAULT 'medspa_demo';

ALTER TABLE leads
    DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE leads
    ADD CONSTRAINT leads_status_check
    CHECK (status IN ('pending', 'dormant', 'contacted', 'booked', 'dead'));

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

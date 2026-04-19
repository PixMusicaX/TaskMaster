-- Add google_event_id to tasks for bi-directional sync
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS google_event_id TEXT UNIQUE;

-- Add google_event_id to events for bi-directional sync
ALTER TABLE events ADD COLUMN IF NOT EXISTS google_event_id TEXT UNIQUE;

-- Ensure google_tokens stores the refresh_token properly
-- We enforce a single-row tokens table using a fixed singleton id
ALTER TABLE google_tokens ADD COLUMN IF NOT EXISTS singleton INT NOT NULL DEFAULT 1;
ALTER TABLE google_tokens DROP CONSTRAINT IF EXISTS google_tokens_singleton_key;
ALTER TABLE google_tokens ADD CONSTRAINT google_tokens_singleton_key UNIQUE (singleton);

-- Track last sync time for the UI "Last synced" display
ALTER TABLE google_tokens ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

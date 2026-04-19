-- Re-adding columns that were mistakenly added to 002 after it had already run
ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Personal';
ALTER TABLE events ADD COLUMN IF NOT EXISTS notes TEXT;

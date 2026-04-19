-- Wipe all data from routine and diary as requested
TRUNCATE TABLE habit_logs;
TRUNCATE TABLE habits CASCADE;
TRUNCATE TABLE diary_entries;

-- Modify diary_entries content to be JSONB for bullet points
ALTER TABLE diary_entries 
ALTER COLUMN content TYPE JSONB USING content::JSONB;

-- Set default empty array for content
ALTER TABLE diary_entries 
ALTER COLUMN content SET DEFAULT '[]'::JSONB;

-- Create habits table
CREATE TABLE IF NOT EXISTS habits (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create habit_logs table
CREATE TABLE IF NOT EXISTS habit_logs (
    habit_id INT REFERENCES habits(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (habit_id, log_date)
);

-- Add some initial habits based on user's spreadsheet
INSERT INTO habits (name) VALUES 
('LTIM Office V'),
('Piano Practice'),
('Coding Practice'),
('Studio Works'),
('Coaching');

-- Add days_of_week column to habits table
-- 0 = Sunday, 1 = Monday, ..., 6 = Saturday
ALTER TABLE habits ADD COLUMN days_of_week INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6];

-- Add rental_price column to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS rental_price DECIMAL(10, 2);

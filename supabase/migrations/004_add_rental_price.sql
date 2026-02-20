-- Add rental_price column to tenancies table
ALTER TABLE tenancies 
ADD COLUMN rental_price NUMERIC(10, 2);

-- Add comment to explain the column
COMMENT ON COLUMN tenancies.rental_price IS 'Monthly rental price for this tenancy';

-- Create index for potential price-based queries
CREATE INDEX idx_tenancies_rental_price ON tenancies(rental_price);

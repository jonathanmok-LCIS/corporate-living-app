-- Add workflow fields for rent review drafts and applied records

ALTER TABLE house_financial_history
ADD COLUMN IF NOT EXISTS effective_date DATE,
ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'APPLIED',
ADD COLUMN IF NOT EXISTS current_rental_cost NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS projected_rental_cost NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS buffer_percentage NUMERIC(8, 4),
ADD COLUMN IF NOT EXISTS total_weighting NUMERIC(10, 4);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'house_financial_history_review_status_check'
  ) THEN
    ALTER TABLE house_financial_history
    ADD CONSTRAINT house_financial_history_review_status_check
    CHECK (review_status IN ('DRAFT', 'APPLIED'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_house_financial_history_house_status_recorded
ON house_financial_history(house_id, review_status, recorded_at DESC);

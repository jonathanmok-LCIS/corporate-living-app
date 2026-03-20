-- Add persistent monthly house cost and a snapshot history table for rent reviews

ALTER TABLE houses
ADD COLUMN IF NOT EXISTS monthly_cost NUMERIC(10, 2);

COMMENT ON COLUMN houses.monthly_cost IS 'Monthly lease/sublease cost of the house';

CREATE TABLE IF NOT EXISTS house_financial_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  monthly_cost NUMERIC(10, 2),
  receivable_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  room_rents JSONB NOT NULL DEFAULT '{}'::jsonb,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE house_financial_history IS 'Historical snapshots of house cost and receivable room rent amounts';
COMMENT ON COLUMN house_financial_history.room_rents IS 'JSON object keyed by room label with rent amount values';

CREATE INDEX IF NOT EXISTS idx_house_financial_history_house_id_recorded_at
ON house_financial_history(house_id, recorded_at DESC);

ALTER TABLE house_financial_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and coordinators can view financial history" ON house_financial_history;
CREATE POLICY "Admins and coordinators can view financial history"
  ON house_financial_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND ('ADMIN' = ANY(profiles.roles) OR 'COORDINATOR' = ANY(profiles.roles))
    )
  );

DROP POLICY IF EXISTS "Admins can insert financial history" ON house_financial_history;
CREATE POLICY "Admins can insert financial history"
  ON house_financial_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND 'ADMIN' = ANY(profiles.roles)
    )
  );

-- Reconcile email notification logging for environments where the table was not created.

CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  recipient_id UUID REFERENCES profiles(id),
  notification_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING',
  error_message TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient_id
  ON email_notifications(recipient_id);

CREATE INDEX IF NOT EXISTS idx_email_notifications_status
  ON email_notifications(status);

CREATE INDEX IF NOT EXISTS idx_email_notifications_type
  ON email_notifications(notification_type);

ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own email notifications" ON email_notifications;
CREATE POLICY "Users can view own email notifications"
  ON email_notifications FOR SELECT
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all email notifications" ON email_notifications;
CREATE POLICY "Admins can view all email notifications"
  ON email_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND 'ADMIN' = ANY(profiles.roles)
    )
  )
  );

DROP POLICY IF EXISTS "System can insert email notifications" ON email_notifications;
CREATE POLICY "System can insert email notifications"
  ON email_notifications FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE email_notifications IS 'Email notification tracking';
CREATE TABLE IF NOT EXISTS waitlist_emails (
  email TEXT PRIMARY KEY NOT NULL,
  source TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS waitlist_emails_last_seen_idx
  ON waitlist_emails (last_seen_at);

ALTER TABLE ident_sessions
  ADD COLUMN revoked_at DATETIME(3) NULL AFTER expires_at,
  ADD COLUMN last_seen_at DATETIME(3) NULL AFTER created_at;

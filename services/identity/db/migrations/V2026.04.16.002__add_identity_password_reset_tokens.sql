CREATE TABLE IF NOT EXISTS ident_password_resets (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  reset_token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  consumed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY ident_password_resets_reset_token_key (reset_token_hash),
  KEY ident_password_resets_user_id_idx (user_id),
  KEY ident_password_resets_expires_at_idx (expires_at),
  CONSTRAINT ident_password_resets_user_id_fk
    FOREIGN KEY (user_id) REFERENCES ident_users (id)
    ON DELETE CASCADE
);

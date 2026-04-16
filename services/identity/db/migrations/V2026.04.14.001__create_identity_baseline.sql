CREATE TABLE IF NOT EXISTS ident_users (
  id VARCHAR(64) NOT NULL,
  handle VARCHAR(32) NOT NULL,
  display_name VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY ident_users_handle_key (handle)
);

CREATE TABLE IF NOT EXISTS ident_credentials (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  provider VARCHAR(32) NOT NULL,
  password_hash VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ident_credentials_user_id_idx (user_id),
  CONSTRAINT ident_credentials_user_id_fk
    FOREIGN KEY (user_id) REFERENCES ident_users (id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ident_sessions (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  refresh_token VARCHAR(255) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY ident_sessions_refresh_token_key (refresh_token),
  KEY ident_sessions_user_id_idx (user_id),
  CONSTRAINT ident_sessions_user_id_fk
    FOREIGN KEY (user_id) REFERENCES ident_users (id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ident_outbox (
  id VARCHAR(64) NOT NULL,
  aggregate_type VARCHAR(32) NOT NULL,
  aggregate_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(96) NOT NULL,
  payload JSON NOT NULL,
  published_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ident_outbox_published_at_idx (published_at)
);

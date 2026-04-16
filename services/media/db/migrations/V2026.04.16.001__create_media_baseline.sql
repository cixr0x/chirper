CREATE TABLE IF NOT EXISTS media_uploads (
  id VARCHAR(64) NOT NULL,
  owner_user_id VARCHAR(64) NOT NULL,
  purpose VARCHAR(32) NOT NULL,
  source_url VARCHAR(255) NOT NULL,
  status VARCHAR(16) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY media_uploads_owner_user_id_created_at_idx (owner_user_id, created_at)
);

CREATE TABLE IF NOT EXISTS media_assets (
  id VARCHAR(64) NOT NULL,
  upload_id VARCHAR(64) NOT NULL,
  owner_user_id VARCHAR(64) NOT NULL,
  purpose VARCHAR(32) NOT NULL,
  source_url VARCHAR(255) NOT NULL,
  storage_key VARCHAR(255) NOT NULL,
  mime_type VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY media_assets_upload_id_idx (upload_id),
  KEY media_assets_owner_user_id_purpose_created_at_idx (owner_user_id, purpose, created_at)
);

CREATE TABLE IF NOT EXISTS media_variants (
  id VARCHAR(64) NOT NULL,
  asset_id VARCHAR(64) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  storage_key VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY media_variants_asset_kind_key (asset_id, kind)
);

CREATE TABLE IF NOT EXISTS media_outbox (
  id VARCHAR(64) NOT NULL,
  aggregate_type VARCHAR(32) NOT NULL,
  aggregate_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(96) NOT NULL,
  payload JSON NOT NULL,
  published_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY media_outbox_published_at_idx (published_at)
);

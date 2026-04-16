CREATE TABLE IF NOT EXISTS profile_profiles (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  bio VARCHAR(280) NULL,
  location VARCHAR(128) NULL,
  avatar_url VARCHAR(255) NULL,
  banner_url VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY profile_profiles_user_id_key (user_id)
);

CREATE TABLE IF NOT EXISTS profile_settings (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  allow_tagging BOOLEAN NOT NULL DEFAULT TRUE,
  allow_direct_inbox BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY profile_settings_user_id_key (user_id)
);

CREATE TABLE IF NOT EXISTS profile_profile_links (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  label VARCHAR(32) NOT NULL,
  url VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY profile_profile_links_user_id_idx (user_id)
);

CREATE TABLE IF NOT EXISTS profile_outbox (
  id VARCHAR(64) NOT NULL,
  aggregate_type VARCHAR(32) NOT NULL,
  aggregate_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(96) NOT NULL,
  payload JSON NOT NULL,
  published_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY profile_outbox_published_at_idx (published_at)
);


CREATE TABLE IF NOT EXISTS timeline_home_entries (
  id VARCHAR(160) NOT NULL,
  owner_user_id VARCHAR(64) NOT NULL,
  source_post_id VARCHAR(64) NOT NULL,
  actor_user_id VARCHAR(64) NOT NULL,
  rank_score DECIMAL(14, 4) NOT NULL,
  inserted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY timeline_home_entries_owner_post_key (owner_user_id, source_post_id),
  KEY timeline_home_entries_owner_inserted_idx (owner_user_id, inserted_at)
);

CREATE TABLE IF NOT EXISTS timeline_user_entries (
  id VARCHAR(160) NOT NULL,
  owner_user_id VARCHAR(64) NOT NULL,
  source_post_id VARCHAR(64) NOT NULL,
  inserted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY timeline_user_entries_owner_post_key (owner_user_id, source_post_id),
  KEY timeline_user_entries_owner_inserted_idx (owner_user_id, inserted_at)
);

CREATE TABLE IF NOT EXISTS timeline_rank_state (
  id VARCHAR(64) NOT NULL,
  owner_user_id VARCHAR(64) NOT NULL,
  timeline_cursor VARCHAR(128) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY timeline_rank_state_owner_user_id_key (owner_user_id)
);

CREATE TABLE IF NOT EXISTS timeline_inbox (
  id VARCHAR(64) NOT NULL,
  event_type VARCHAR(96) NOT NULL,
  payload JSON NOT NULL,
  received_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  processed_at DATETIME(3) NULL,
  PRIMARY KEY (id)
);

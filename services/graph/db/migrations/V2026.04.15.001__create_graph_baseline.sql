CREATE TABLE IF NOT EXISTS graph_follows (
  id VARCHAR(64) NOT NULL,
  follower_id VARCHAR(64) NOT NULL,
  followee_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY graph_follows_follower_followee_key (follower_id, followee_id),
  KEY graph_follows_followee_created_idx (followee_id, created_at)
);

CREATE TABLE IF NOT EXISTS graph_blocks (
  id VARCHAR(64) NOT NULL,
  blocker_id VARCHAR(64) NOT NULL,
  blocked_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY graph_blocks_blocker_blocked_key (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS graph_mutes (
  id VARCHAR(64) NOT NULL,
  muter_id VARCHAR(64) NOT NULL,
  muted_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY graph_mutes_muter_muted_key (muter_id, muted_id)
);

CREATE TABLE IF NOT EXISTS graph_outbox (
  id VARCHAR(64) NOT NULL,
  aggregate_type VARCHAR(32) NOT NULL,
  aggregate_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(96) NOT NULL,
  payload JSON NOT NULL,
  published_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY graph_outbox_published_at_idx (published_at)
);

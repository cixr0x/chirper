CREATE TABLE IF NOT EXISTS posts_posts (
  id VARCHAR(64) NOT NULL,
  author_id VARCHAR(64) NOT NULL,
  in_reply_to_post_id VARCHAR(64) NULL,
  body VARCHAR(280) NOT NULL,
  visibility VARCHAR(16) NOT NULL DEFAULT 'public',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY posts_posts_author_created_idx (author_id, created_at)
);

CREATE TABLE IF NOT EXISTS posts_likes (
  id VARCHAR(64) NOT NULL,
  post_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY posts_likes_post_user_key (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS posts_reposts (
  id VARCHAR(64) NOT NULL,
  post_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY posts_reposts_post_user_key (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS posts_post_media (
  id VARCHAR(64) NOT NULL,
  post_id VARCHAR(64) NOT NULL,
  asset_id VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY posts_post_media_post_asset_key (post_id, asset_id)
);

CREATE TABLE IF NOT EXISTS posts_outbox (
  id VARCHAR(64) NOT NULL,
  aggregate_type VARCHAR(32) NOT NULL,
  aggregate_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(96) NOT NULL,
  payload JSON NOT NULL,
  published_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id)
);


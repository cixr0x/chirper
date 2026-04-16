CREATE TABLE IF NOT EXISTS notify_follow_edges (
  id VARCHAR(160) NOT NULL,
  owner_user_id VARCHAR(64) NOT NULL,
  followee_user_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY notify_follow_edges_owner_followee_key (owner_user_id, followee_user_id),
  KEY notify_follow_edges_followee_idx (followee_user_id),
  KEY notify_follow_edges_owner_idx (owner_user_id)
);

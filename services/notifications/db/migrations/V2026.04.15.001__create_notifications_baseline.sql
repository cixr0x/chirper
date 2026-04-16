CREATE TABLE IF NOT EXISTS notify_notifications (
  id VARCHAR(64) NOT NULL,
  recipient_id VARCHAR(64) NOT NULL,
  actor_user_id VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  resource_id VARCHAR(64) NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY notify_notifications_recipient_type_resource_key (recipient_id, type, resource_id),
  KEY notify_notifications_recipient_created_idx (recipient_id, created_at)
);

CREATE TABLE IF NOT EXISTS notify_preferences (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY notify_preferences_user_id_key (user_id)
);

CREATE TABLE IF NOT EXISTS notify_delivery_attempts (
  id VARCHAR(64) NOT NULL,
  notification_id VARCHAR(64) NOT NULL,
  channel VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL,
  attempted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY notify_delivery_attempts_notification_id_idx (notification_id)
);

CREATE TABLE IF NOT EXISTS notify_inbox (
  id VARCHAR(64) NOT NULL,
  event_type VARCHAR(96) NOT NULL,
  payload JSON NOT NULL,
  received_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  processed_at DATETIME(3) NULL,
  PRIMARY KEY (id)
);

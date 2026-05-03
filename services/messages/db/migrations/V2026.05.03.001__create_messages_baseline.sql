CREATE TABLE IF NOT EXISTS msg_conversations (
  id VARCHAR(64) PRIMARY KEY,
  participant_low_user_id VARCHAR(64) NOT NULL,
  participant_high_user_id VARCHAR(64) NOT NULL,
  last_message_id VARCHAR(64) NULL,
  last_message_sequence BIGINT NULL,
  last_message_preview VARCHAR(180) NOT NULL DEFAULT '',
  last_message_author_user_id VARCHAR(64) NULL,
  last_message_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY msg_conversations_participants_key (participant_low_user_id, participant_high_user_id),
  KEY msg_conversations_last_message_idx (last_message_at, id)
);

CREATE TABLE IF NOT EXISTS msg_messages (
  id VARCHAR(64) PRIMARY KEY,
  sequence BIGINT NOT NULL AUTO_INCREMENT,
  conversation_id VARCHAR(64) NOT NULL,
  author_user_id VARCHAR(64) NOT NULL,
  body VARCHAR(2000) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY msg_messages_sequence_key (sequence),
  KEY msg_messages_conversation_sequence_idx (conversation_id, sequence),
  KEY msg_messages_conversation_created_idx (conversation_id, created_at, id)
);

CREATE TABLE IF NOT EXISTS msg_conversation_reads (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  last_read_message_id VARCHAR(64) NULL,
  last_read_message_sequence BIGINT NULL,
  last_read_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY msg_conversation_reads_conversation_user_key (conversation_id, user_id)
);

INSERT INTO notify_preferences (id, user_id, push_enabled, email_enabled)
VALUES
  ('notify_pref_demo_alana', 'usr_demo_alana', TRUE, FALSE),
  ('notify_pref_demo_omar', 'usr_demo_omar', TRUE, FALSE)
ON DUPLICATE KEY UPDATE
  push_enabled = VALUES(push_enabled),
  email_enabled = VALUES(email_enabled);

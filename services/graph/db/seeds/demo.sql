INSERT INTO graph_follows (id, follower_id, followee_id)
VALUES
  ('follow_demo_alana_omar', 'usr_demo_alana', 'usr_demo_omar')
ON DUPLICATE KEY UPDATE
  follower_id = VALUES(follower_id),
  followee_id = VALUES(followee_id);

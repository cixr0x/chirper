ALTER TABLE timeline_home_entries
  ADD COLUMN activity_type VARCHAR(16) NOT NULL DEFAULT 'post' AFTER actor_user_id;

ALTER TABLE timeline_user_entries
  ADD COLUMN activity_type VARCHAR(16) NOT NULL DEFAULT 'post' AFTER source_post_id;

ALTER TABLE timeline_home_entries
  DROP INDEX timeline_home_entries_owner_post_key;

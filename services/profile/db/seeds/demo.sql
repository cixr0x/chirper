INSERT INTO profile_profiles (id, user_id, bio, location, avatar_url, banner_url)
VALUES
  (
    'profile_demo_alana',
    'usr_demo_alana',
    'Building Chirper as a distributed systems exercise.',
    'Monterrey',
    'https://example.com/avatars/alana.png',
    'https://example.com/banners/alana.png'
  ),
  (
    'profile_demo_omar',
    'usr_demo_omar',
    'Prefers event-driven timelines over cross-service joins.',
    'Guadalajara',
    'https://example.com/avatars/omar.png',
    'https://example.com/banners/omar.png'
  )
ON DUPLICATE KEY UPDATE
  bio = VALUES(bio),
  location = VALUES(location),
  avatar_url = VALUES(avatar_url),
  banner_url = VALUES(banner_url);

INSERT INTO profile_settings (id, user_id, is_private, allow_tagging, allow_direct_inbox)
VALUES
  ('setting_demo_alana', 'usr_demo_alana', FALSE, TRUE, TRUE),
  ('setting_demo_omar', 'usr_demo_omar', FALSE, TRUE, TRUE)
ON DUPLICATE KEY UPDATE
  is_private = VALUES(is_private),
  allow_tagging = VALUES(allow_tagging),
  allow_direct_inbox = VALUES(allow_direct_inbox);

INSERT INTO profile_profile_links (id, user_id, label, url)
VALUES
  ('link_demo_alana_github', 'usr_demo_alana', 'GitHub', 'https://github.com/alana'),
  ('link_demo_omar_site', 'usr_demo_omar', 'Website', 'https://omar.example.com')
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  url = VALUES(url);

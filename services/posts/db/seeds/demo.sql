INSERT INTO posts_posts (id, author_id, body, visibility)
VALUES
  (
    'post_demo_alana_001',
    'usr_demo_alana',
    'Chirper now has real profile pages backed by service-owned tables.',
    'public'
  ),
  (
    'post_demo_omar_001',
    'usr_demo_omar',
    'Next milestone: posts service, compose flow, and the first public timeline.',
    'public'
  )
ON DUPLICATE KEY UPDATE
  body = VALUES(body),
  visibility = VALUES(visibility);

INSERT INTO media_uploads (id, owner_user_id, purpose, source_url, status, completed_at)
VALUES
  (
    'upload_demo_alana_avatar',
    'usr_demo_alana',
    'profile_avatar',
    'https://placehold.co/160x160/f97316/ffffff.png?text=AP',
    'ready',
    CURRENT_TIMESTAMP(3)
  ),
  (
    'upload_demo_alana_banner',
    'usr_demo_alana',
    'profile_banner',
    'https://placehold.co/1200x320/f97316/fff7ed.png?text=Alana+Pierce',
    'ready',
    CURRENT_TIMESTAMP(3)
  ),
  (
    'upload_demo_omar_avatar',
    'usr_demo_omar',
    'profile_avatar',
    'https://placehold.co/160x160/0f766e/f0fdfa.png?text=OR',
    'ready',
    CURRENT_TIMESTAMP(3)
  ),
  (
    'upload_demo_omar_banner',
    'usr_demo_omar',
    'profile_banner',
    'https://placehold.co/1200x320/0f766e/f0fdfa.png?text=Omar+Reed',
    'ready',
    CURRENT_TIMESTAMP(3)
  )
ON DUPLICATE KEY UPDATE
  owner_user_id = VALUES(owner_user_id),
  purpose = VALUES(purpose),
  source_url = VALUES(source_url),
  status = VALUES(status),
  completed_at = VALUES(completed_at);

INSERT INTO media_assets (id, upload_id, owner_user_id, purpose, source_url, storage_key, mime_type, status)
VALUES
  (
    'asset_demo_alana_avatar',
    'upload_demo_alana_avatar',
    'usr_demo_alana',
    'profile_avatar',
    'https://placehold.co/160x160/f97316/ffffff.png?text=AP',
    'profile_avatar/asset_demo_alana_avatar',
    'image/png',
    'ready'
  ),
  (
    'asset_demo_alana_banner',
    'upload_demo_alana_banner',
    'usr_demo_alana',
    'profile_banner',
    'https://placehold.co/1200x320/f97316/fff7ed.png?text=Alana+Pierce',
    'profile_banner/asset_demo_alana_banner',
    'image/png',
    'ready'
  ),
  (
    'asset_demo_omar_avatar',
    'upload_demo_omar_avatar',
    'usr_demo_omar',
    'profile_avatar',
    'https://placehold.co/160x160/0f766e/f0fdfa.png?text=OR',
    'profile_avatar/asset_demo_omar_avatar',
    'image/png',
    'ready'
  ),
  (
    'asset_demo_omar_banner',
    'upload_demo_omar_banner',
    'usr_demo_omar',
    'profile_banner',
    'https://placehold.co/1200x320/0f766e/f0fdfa.png?text=Omar+Reed',
    'profile_banner/asset_demo_omar_banner',
    'image/png',
    'ready'
  )
ON DUPLICATE KEY UPDATE
  upload_id = VALUES(upload_id),
  owner_user_id = VALUES(owner_user_id),
  purpose = VALUES(purpose),
  source_url = VALUES(source_url),
  storage_key = VALUES(storage_key),
  mime_type = VALUES(mime_type),
  status = VALUES(status);

INSERT INTO media_variants (id, asset_id, kind, storage_key)
VALUES
  ('variant_demo_alana_avatar_original', 'asset_demo_alana_avatar', 'original', 'profile_avatar/asset_demo_alana_avatar'),
  ('variant_demo_alana_banner_original', 'asset_demo_alana_banner', 'original', 'profile_banner/asset_demo_alana_banner'),
  ('variant_demo_omar_avatar_original', 'asset_demo_omar_avatar', 'original', 'profile_avatar/asset_demo_omar_avatar'),
  ('variant_demo_omar_banner_original', 'asset_demo_omar_banner', 'original', 'profile_banner/asset_demo_omar_banner')
ON DUPLICATE KEY UPDATE
  asset_id = VALUES(asset_id),
  kind = VALUES(kind),
  storage_key = VALUES(storage_key);

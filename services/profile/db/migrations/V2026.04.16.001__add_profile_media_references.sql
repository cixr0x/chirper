ALTER TABLE profile_profiles
  ADD COLUMN avatar_asset_id VARCHAR(64) NULL AFTER location,
  ADD COLUMN banner_asset_id VARCHAR(64) NULL AFTER avatar_asset_id;

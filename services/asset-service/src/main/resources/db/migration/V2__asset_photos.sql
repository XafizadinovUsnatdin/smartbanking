CREATE TABLE asset_photos (
  id UUID PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES assets(id),
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  created_by VARCHAR(120) NOT NULL
);

CREATE INDEX ix_asset_photos_asset_id ON asset_photos(asset_id, created_at DESC);


ALTER TABLE assets
  ADD COLUMN deleted_at TIMESTAMPTZ NULL,
  ADD COLUMN deleted_by VARCHAR(120) NULL,
  ADD COLUMN delete_reason VARCHAR(400) NULL;

CREATE INDEX IF NOT EXISTS ix_assets_deleted_at ON assets(deleted_at);


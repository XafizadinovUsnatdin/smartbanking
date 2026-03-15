CREATE TABLE inventory_sessions (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  owner_type VARCHAR(50) NOT NULL,
  owner_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  created_by VARCHAR(120) NOT NULL,
  closed_at TIMESTAMPTZ NULL,
  closed_by VARCHAR(120) NULL
);

CREATE TABLE inventory_expected_assets (
  session_id UUID NOT NULL REFERENCES inventory_sessions(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id),
  PRIMARY KEY (session_id, asset_id)
);

CREATE INDEX ix_inventory_expected_assets_session_id ON inventory_expected_assets(session_id);

CREATE TABLE inventory_scans (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES inventory_sessions(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id),
  scanned_at TIMESTAMPTZ NOT NULL,
  scanned_by VARCHAR(120) NOT NULL,
  note VARCHAR(400),
  UNIQUE (session_id, asset_id)
);

CREATE INDEX ix_inventory_scans_session_id ON inventory_scans(session_id);


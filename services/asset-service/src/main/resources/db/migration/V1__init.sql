CREATE TABLE asset_categories (
  code VARCHAR(50) PRIMARY KEY,
  name VARCHAR(120) NOT NULL
);

CREATE TABLE assets (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(120) NOT NULL,
  category_code VARCHAR(50) NOT NULL REFERENCES asset_categories(code),
  serial_number VARCHAR(120) NOT NULL UNIQUE,
  inventory_tag VARCHAR(120) UNIQUE,
  model VARCHAR(120),
  vendor VARCHAR(120),
  purchase_date DATE,
  warranty_until DATE,
  cost NUMERIC(19,2),
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE asset_assignments (
  id UUID PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES assets(id),
  owner_type VARCHAR(50) NOT NULL,
  owner_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL,
  assigned_by VARCHAR(120) NOT NULL,
  assign_reason VARCHAR(400),
  returned_at TIMESTAMPTZ NULL,
  returned_by VARCHAR(120),
  return_reason VARCHAR(400)
);

CREATE UNIQUE INDEX ux_asset_active_assignment ON asset_assignments(asset_id) WHERE returned_at IS NULL;
CREATE INDEX ix_asset_assignments_asset_id ON asset_assignments(asset_id);

CREATE TABLE asset_status_history (
  id UUID PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES assets(id),
  from_status VARCHAR(50) NOT NULL,
  to_status VARCHAR(50) NOT NULL,
  reason VARCHAR(400),
  changed_by VARCHAR(120) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_asset_status_history_asset_id ON asset_status_history(asset_id);

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(120) NOT NULL,
  aggregate_type VARCHAR(80) NOT NULL,
  aggregate_id UUID NOT NULL,
  schema_version VARCHAR(20) NOT NULL,
  correlation_id VARCHAR(120),
  actor_id VARCHAR(120),
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ NULL
);

CREATE INDEX ix_outbox_unpublished ON outbox_events(occurred_at) WHERE published_at IS NULL;

INSERT INTO asset_categories(code, name) VALUES
('IT', 'IT'),
('OFFICE', 'Office'),
('SECURITY', 'Security'),
('NETWORK', 'Network'),
('SERVER', 'Server'),
('OTHER', 'Other')
ON CONFLICT DO NOTHING;


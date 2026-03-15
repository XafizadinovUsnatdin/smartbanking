CREATE TABLE asset_requests (
  id UUID PRIMARY KEY,
  requester_id UUID NOT NULL,
  requester_username VARCHAR(120) NOT NULL,
  status VARCHAR(50) NOT NULL,
  note VARCHAR(1000),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  decided_at TIMESTAMPTZ NULL,
  decided_by VARCHAR(120),
  decision_note VARCHAR(1000)
);

CREATE INDEX ix_asset_requests_requester_id ON asset_requests(requester_id);
CREATE INDEX ix_asset_requests_status ON asset_requests(status);
CREATE INDEX ix_asset_requests_created_at ON asset_requests(created_at);

CREATE TABLE asset_request_items (
  id UUID PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES asset_requests(id) ON DELETE CASCADE,
  asset_type VARCHAR(120) NOT NULL,
  category_code VARCHAR(50) NOT NULL REFERENCES asset_categories(code),
  quantity INT NOT NULL CHECK (quantity > 0)
);

CREATE INDEX ix_asset_request_items_request_id ON asset_request_items(request_id);
CREATE INDEX ix_asset_request_items_cat_type ON asset_request_items(category_code, asset_type);


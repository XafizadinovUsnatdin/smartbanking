CREATE TABLE asset_status_counts (
  status VARCHAR(50) PRIMARY KEY,
  cnt BIGINT NOT NULL
);

CREATE TABLE asset_category_counts (
  category_code VARCHAR(50) PRIMARY KEY,
  cnt BIGINT NOT NULL
);


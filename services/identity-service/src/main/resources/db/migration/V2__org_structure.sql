CREATE TABLE branches (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  address VARCHAR(400),
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE departments (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  branch_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_departments_branch_id ON departments(branch_id);

-- Sample organization structure (safe for demos; remove for production if not needed).
INSERT INTO branches(id, name, address, created_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Head Office', 'Main HQ, Tashkent', now())
ON CONFLICT DO NOTHING;

INSERT INTO departments(id, name, branch_id, created_at) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'IT Department', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Operations', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())
ON CONFLICT DO NOTHING;


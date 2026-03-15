-- Run manually after asset-service has applied Flyway migrations.
-- Example: psql -h localhost -U smartbanking -d asset_db -f infra/sample-data/asset_db.sql

INSERT INTO assets(id, name, type, category_code, serial_number, inventory_tag, model, vendor, status, created_at, updated_at)
VALUES
('11111111-1111-1111-1111-111111111111', 'Dell Latitude 5440', 'LAPTOP', 'IT', 'SN-0001', 'INV-0001', '5440', 'Dell', 'REGISTERED', now(), now()),
('22222222-2222-2222-2222-222222222222', 'HP LaserJet Pro', 'PRINTER', 'OFFICE', 'SN-PR-0001', 'INV-PR-0001', 'M404', 'HP', 'REGISTERED', now(), now())
ON CONFLICT DO NOTHING;


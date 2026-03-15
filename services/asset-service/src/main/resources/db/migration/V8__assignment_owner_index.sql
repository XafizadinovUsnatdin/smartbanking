-- Speed up lookups by owner (employee/department/branch) for active assignments.
CREATE INDEX IF NOT EXISTS ix_asset_assignments_active_owner
  ON asset_assignments(owner_type, owner_id)
  WHERE returned_at IS NULL;


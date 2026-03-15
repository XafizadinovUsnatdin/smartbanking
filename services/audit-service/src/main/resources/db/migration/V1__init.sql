CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  event_type VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID NOT NULL,
  actor_id VARCHAR(120),
  correlation_id VARCHAR(120),
  occurred_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL
);

CREATE INDEX ix_audit_entity ON audit_logs(entity_type, entity_id, occurred_at DESC);


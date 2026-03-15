package com.smartbanking.audit.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "audit_logs")
public class AuditLog {
  @Id
  @Column(name = "id", nullable = false)
  private UUID id;

  @Column(name = "event_type", nullable = false, length = 120)
  private String eventType;

  @Column(name = "entity_type", nullable = false, length = 80)
  private String entityType;

  @Column(name = "entity_id", nullable = false)
  private UUID entityId;

  @Column(name = "actor_id", length = 120)
  private String actorId;

  @Column(name = "correlation_id", length = 120)
  private String correlationId;

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "payload", nullable = false, columnDefinition = "jsonb")
  private String payload;

  protected AuditLog() {}

  public AuditLog(UUID id, String eventType, String entityType, UUID entityId, String actorId, String correlationId, Instant occurredAt, String payload) {
    this.id = id;
    this.eventType = eventType;
    this.entityType = entityType;
    this.entityId = entityId;
    this.actorId = actorId;
    this.correlationId = correlationId;
    this.occurredAt = occurredAt;
    this.payload = payload;
  }

  public UUID getId() { return id; }
  public String getEventType() { return eventType; }
  public String getEntityType() { return entityType; }
  public UUID getEntityId() { return entityId; }
  public String getActorId() { return actorId; }
  public String getCorrelationId() { return correlationId; }
  public Instant getOccurredAt() { return occurredAt; }
  public String getPayload() { return payload; }
}

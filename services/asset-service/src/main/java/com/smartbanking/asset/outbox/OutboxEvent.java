package com.smartbanking.asset.outbox;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "outbox_events")
public class OutboxEvent {
  @Id
  @Column(name = "id", nullable = false)
  private UUID id;

  @Column(name = "event_type", nullable = false, length = 120)
  private String eventType;

  @Column(name = "aggregate_type", nullable = false, length = 80)
  private String aggregateType;

  @Column(name = "aggregate_id", nullable = false)
  private UUID aggregateId;

  @Column(name = "schema_version", nullable = false, length = 20)
  private String schemaVersion;

  @Column(name = "correlation_id", length = 120)
  private String correlationId;

  @Column(name = "actor_id", length = 120)
  private String actorId;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "payload", nullable = false, columnDefinition = "jsonb")
  private String payload;

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt;

  @Column(name = "published_at")
  private Instant publishedAt;

  protected OutboxEvent() {}

  public OutboxEvent(UUID id, String eventType, String aggregateType, UUID aggregateId, String schemaVersion,
                     String correlationId, String actorId, String payload, Instant occurredAt) {
    this.id = id;
    this.eventType = eventType;
    this.aggregateType = aggregateType;
    this.aggregateId = aggregateId;
    this.schemaVersion = schemaVersion;
    this.correlationId = correlationId;
    this.actorId = actorId;
    this.payload = payload;
    this.occurredAt = occurredAt;
  }

  public UUID getId() { return id; }
  public String getEventType() { return eventType; }
  public UUID getAggregateId() { return aggregateId; }
  public String getPayload() { return payload; }
  public Instant getPublishedAt() { return publishedAt; }
  public void markPublished() { this.publishedAt = Instant.now(); }
}

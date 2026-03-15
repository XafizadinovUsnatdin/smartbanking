package com.smartbanking.common.events;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record EventEnvelope(
    UUID eventId,
    String eventType,
    Instant occurredAt,
    String schemaVersion,
    String correlationId,
    String actorId,
    Map<String, Object> payload
) {
  public static EventEnvelope of(
      String eventType,
      String schemaVersion,
      String correlationId,
      String actorId,
      Map<String, Object> payload
  ) {
    return new EventEnvelope(UUID.randomUUID(), eventType, Instant.now(), schemaVersion, correlationId, actorId, payload);
  }
}


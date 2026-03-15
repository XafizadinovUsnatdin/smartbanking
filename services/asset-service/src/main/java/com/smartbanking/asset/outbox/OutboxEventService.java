package com.smartbanking.asset.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbanking.common.events.EventEnvelope;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class OutboxEventService {
  private final OutboxEventRepository outboxRepo;
  private final ObjectMapper objectMapper;

  public OutboxEventService(OutboxEventRepository outboxRepo, ObjectMapper objectMapper) {
    this.outboxRepo = outboxRepo;
    this.objectMapper = objectMapper;
  }

  public void enqueue(String type, String aggregateType, UUID aggregateId, String actor, String correlationId, Map<String, Object> payload) {
    try {
      EventEnvelope env = EventEnvelope.of(type, "v1", correlationId, actor, payload);
      outboxRepo.save(new OutboxEvent(
          env.eventId(),
          env.eventType(),
          aggregateType,
          aggregateId,
          env.schemaVersion(),
          env.correlationId(),
          env.actorId(),
          objectMapper.writeValueAsString(env),
          env.occurredAt()
      ));
    } catch (Exception e) {
      throw new RuntimeException("Failed to enqueue outbox event", e);
    }
  }
}


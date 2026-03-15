package com.smartbanking.audit.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbanking.audit.domain.AuditLog;
import com.smartbanking.audit.repo.AuditLogRepository;
import com.smartbanking.common.events.EventEnvelope;
import java.util.Map;
import java.util.UUID;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class AssetEventsConsumer {
  private final ObjectMapper objectMapper;
  private final AuditLogRepository repo;

  public AssetEventsConsumer(ObjectMapper objectMapper, AuditLogRepository repo) {
    this.objectMapper = objectMapper;
    this.repo = repo;
  }

  @KafkaListener(topics = "${kafka.topics.asset-events:asset.events}", groupId = "audit-service")
  public void onMessage(String json) throws Exception {
    EventEnvelope env = objectMapper.readValue(json, EventEnvelope.class);
    Map<String, Object> p = env.payload();
    String entityType = p != null && p.get("entityType") != null ? String.valueOf(p.get("entityType")) : "ASSET";

    UUID entityId = UUID.randomUUID();
    if (p != null) {
      if (p.get("entityId") != null) {
        entityId = UUID.fromString(String.valueOf(p.get("entityId")));
      } else if (p.get("assetId") != null) {
        entityId = UUID.fromString(String.valueOf(p.get("assetId")));
      }
    }
    repo.save(new AuditLog(
        env.eventId(),
        env.eventType(),
        entityType,
        entityId,
        env.actorId(),
        env.correlationId(),
        env.occurredAt(),
        json
    ));
  }
}

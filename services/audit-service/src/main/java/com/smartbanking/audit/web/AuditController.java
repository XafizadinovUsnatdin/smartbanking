package com.smartbanking.audit.web;

import com.smartbanking.audit.repo.AuditLogRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuditController {
  private final AuditLogRepository repo;

  public AuditController(AuditLogRepository repo) {
    this.repo = repo;
  }

  @GetMapping("/audit")
  public Page<?> find(
      @RequestParam(defaultValue = "ASSET") String entityType,
      @RequestParam(required = false) UUID entityId,
      @RequestParam(required = false) String eventType,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to,
      @PageableDefault(size = 50, sort = "occurredAt", direction = Sort.Direction.DESC) Pageable pageable
  ) {
    Instant fromTs = from == null ? Instant.now().minus(30, ChronoUnit.DAYS) : from;
    Instant toTs = to == null ? Instant.now() : to;
    if (entityId != null && eventType != null && !eventType.isBlank()) {
      return repo.findByEntityTypeAndEntityIdAndEventTypeAndOccurredAtBetween(entityType, entityId, eventType, fromTs, toTs, pageable);
    }
    if (entityId != null) {
      return repo.findByEntityTypeAndEntityIdAndOccurredAtBetween(entityType, entityId, fromTs, toTs, pageable);
    }
    if (eventType != null && !eventType.isBlank()) {
      return repo.findByEntityTypeAndEventTypeAndOccurredAtBetween(entityType, eventType, fromTs, toTs, pageable);
    }
    return repo.findByEntityTypeAndOccurredAtBetween(entityType, fromTs, toTs, pageable);
  }
}

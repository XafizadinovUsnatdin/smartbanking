package com.smartbanking.audit.repo;

import com.smartbanking.audit.domain.AuditLog;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
  Page<AuditLog> findByEntityTypeAndEntityIdAndOccurredAtBetween(
      String entityType, UUID entityId, Instant from, Instant to, Pageable pageable);

  Page<AuditLog> findByEntityTypeAndOccurredAtBetween(
      String entityType, Instant from, Instant to, Pageable pageable);

  Page<AuditLog> findByEntityTypeAndEventTypeAndOccurredAtBetween(
      String entityType, String eventType, Instant from, Instant to, Pageable pageable);

  Page<AuditLog> findByEntityTypeAndEntityIdAndEventTypeAndOccurredAtBetween(
      String entityType, UUID entityId, String eventType, Instant from, Instant to, Pageable pageable);
}

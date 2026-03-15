package com.smartbanking.asset.outbox;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {
  @Query(value = "select * from outbox_events where published_at is null order by occurred_at asc limit 100", nativeQuery = true)
  List<OutboxEvent> findBatchToPublish();
}


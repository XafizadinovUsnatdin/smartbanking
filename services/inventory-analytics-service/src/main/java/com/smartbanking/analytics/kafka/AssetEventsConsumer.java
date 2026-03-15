package com.smartbanking.analytics.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbanking.analytics.domain.AssetCategoryCount;
import com.smartbanking.analytics.domain.AssetStatusCount;
import com.smartbanking.analytics.repo.AssetCategoryCountRepository;
import com.smartbanking.analytics.repo.AssetStatusCountRepository;
import com.smartbanking.common.events.EventEnvelope;
import java.util.Map;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AssetEventsConsumer {
  private final ObjectMapper objectMapper;
  private final AssetStatusCountRepository statusRepo;
  private final AssetCategoryCountRepository categoryRepo;

  public AssetEventsConsumer(ObjectMapper objectMapper, AssetStatusCountRepository statusRepo, AssetCategoryCountRepository categoryRepo) {
    this.objectMapper = objectMapper;
    this.statusRepo = statusRepo;
    this.categoryRepo = categoryRepo;
  }

  @KafkaListener(topics = "${kafka.topics.asset-events:asset.events}", groupId = "analytics-service")
  @Transactional
  public void onMessage(String json) throws Exception {
    EventEnvelope env = objectMapper.readValue(json, EventEnvelope.class);
    Map<String, Object> p = env.payload();
    if (p == null) return;

    if ("AssetDeleted".equals(env.eventType())) {
      if (p.get("categoryCode") != null) {
        incrementCategory(String.valueOf(p.get("categoryCode")), -1);
      }
      if (p.get("status") != null) {
        incrementStatus(String.valueOf(p.get("status")), -1);
      }
      return;
    }

    if (p.get("categoryCode") != null && "AssetCreated".equals(env.eventType())) {
      String categoryCode = String.valueOf(p.get("categoryCode"));
      incrementCategory(categoryCode, 1);
    }
    if (p.get("fromStatus") != null && p.get("toStatus") != null) {
      incrementStatus(String.valueOf(p.get("fromStatus")), -1);
      incrementStatus(String.valueOf(p.get("toStatus")), 1);
    } else if (p.get("status") != null && "AssetCreated".equals(env.eventType())) {
      incrementStatus(String.valueOf(p.get("status")), 1);
    }
  }

  private void incrementStatus(String status, long delta) {
    AssetStatusCount row = statusRepo.findById(status).orElse(new AssetStatusCount(status, 0));
    row.setCount(Math.max(0, row.getCount() + delta));
    statusRepo.save(row);
  }

  private void incrementCategory(String categoryCode, long delta) {
    AssetCategoryCount row = categoryRepo.findById(categoryCode).orElse(new AssetCategoryCount(categoryCode, 0));
    row.setCount(Math.max(0, row.getCount() + delta));
    categoryRepo.save(row);
  }
}

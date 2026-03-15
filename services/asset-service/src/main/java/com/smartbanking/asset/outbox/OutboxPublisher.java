package com.smartbanking.asset.outbox;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class OutboxPublisher {
  private static final Logger log = LoggerFactory.getLogger(OutboxPublisher.class);

  private final OutboxEventRepository outboxRepo;
  private final KafkaTemplate<String, String> kafkaTemplate;
  private final String topic;

  public OutboxPublisher(OutboxEventRepository outboxRepo,
                         KafkaTemplate<String, String> kafkaTemplate,
                         @Value("${kafka.topics.asset-events}") String topic) {
    this.outboxRepo = outboxRepo;
    this.kafkaTemplate = kafkaTemplate;
    this.topic = topic;
  }

  @Scheduled(fixedDelayString = "${outbox.publisher.delay:2000}")
  @Transactional
  public void publish() {
    List<OutboxEvent> batch = outboxRepo.findBatchToPublish();
    for (OutboxEvent evt : batch) {
      try {
        kafkaTemplate.send(topic, evt.getAggregateId().toString(), evt.getPayload()).get();
        evt.markPublished();
        outboxRepo.save(evt);
      } catch (Exception e) {
        log.warn("Outbox publish failed id={} type={}", evt.getId(), evt.getEventType(), e);
        break;
      }
    }
  }
}


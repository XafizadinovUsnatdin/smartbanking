package com.smartbanking.telegram.bot;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class BotStateRepository {
  private static final Logger log = LoggerFactory.getLogger(BotStateRepository.class);

  private static final String OFFSET_KEY = "tg:offset";
  private static final String LAST_CHECK_PREFIX = "tg:lastcheck:";
  private static final String ISSUE_PREFIX = "tg:issue:";

  private final StringRedisTemplate redis;
  private final ObjectMapper objectMapper;

  public BotStateRepository(StringRedisTemplate redis, ObjectMapper objectMapper) {
    this.redis = redis;
    this.objectMapper = objectMapper;
  }

  public long getLastUpdateId() {
    try {
      String raw = redis.opsForValue().get(OFFSET_KEY);
      if (raw == null || raw.isBlank()) return 0L;
      return Long.parseLong(raw.trim());
    } catch (Exception ignored) {
      return 0L;
    }
  }

  public void setLastUpdateId(long updateId) {
    redis.opsForValue().set(OFFSET_KEY, String.valueOf(updateId));
  }

  public Optional<Instant> getLastCheckSent(UUID userId) {
    if (userId == null) return Optional.empty();
    try {
      String raw = redis.opsForValue().get(LAST_CHECK_PREFIX + userId);
      if (raw == null || raw.isBlank()) return Optional.empty();
      return Optional.of(Instant.parse(raw));
    } catch (Exception ignored) {
      return Optional.empty();
    }
  }

  public void setLastCheckSent(UUID userId, Instant when) {
    if (userId == null || when == null) return;
    redis.opsForValue().set(LAST_CHECK_PREFIX + userId, when.toString());
  }

  public void saveIssue(IssueReport report) {
    if (report == null) return;
    try {
      redis.opsForValue().set(ISSUE_PREFIX + report.id(), objectMapper.writeValueAsString(report));
    } catch (JsonProcessingException e) {
      log.warn("Failed to save issue {}", report.id(), e);
    }
  }

  public Optional<IssueReport> getIssue(UUID reportId) {
    if (reportId == null) return Optional.empty();
    try {
      String raw = redis.opsForValue().get(ISSUE_PREFIX + reportId);
      if (raw == null || raw.isBlank()) return Optional.empty();
      return Optional.of(objectMapper.readValue(raw, IssueReport.class));
    } catch (Exception e) {
      return Optional.empty();
    }
  }

  public void deleteIssue(UUID reportId) {
    if (reportId == null) return;
    redis.delete(ISSUE_PREFIX + reportId);
  }

  public record IssueReport(
      UUID id,
      UUID assetId,
      UUID reporterUserId,
      Long reporterChatId,
      String reporterFullName,
      String requestedStatus,
      String requestedLabel,
      Instant createdAt
  ) {}
}

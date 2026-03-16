package com.smartbanking.telegram.bot;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
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
  private static final String SIGNUP_WIZARD_PREFIX = "tg:signup:wiz:";
  private static final String SIGNUP_REQUEST_PREFIX = "tg:signup:req:";
  private static final String SIGNUP_PENDING_PREFIX = "tg:signup:pending:";
  private static final String REQUEST_WIZARD_PREFIX = "tg:req:wiz:";

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

  public void saveSignupWizard(SignupWizard wizard) {
    if (wizard == null) return;
    try {
      redis.opsForValue().set(SIGNUP_WIZARD_PREFIX + wizard.chatId(), objectMapper.writeValueAsString(wizard));
    } catch (JsonProcessingException e) {
      log.warn("Failed to save signup wizard chatId={}", wizard.chatId(), e);
    }
  }

  public Optional<SignupWizard> getSignupWizard(long chatId) {
    if (chatId <= 0) return Optional.empty();
    try {
      String raw = redis.opsForValue().get(SIGNUP_WIZARD_PREFIX + chatId);
      if (raw == null || raw.isBlank()) return Optional.empty();
      return Optional.of(objectMapper.readValue(raw, SignupWizard.class));
    } catch (Exception ignored) {
      return Optional.empty();
    }
  }

  public void deleteSignupWizard(long chatId) {
    if (chatId <= 0) return;
    redis.delete(SIGNUP_WIZARD_PREFIX + chatId);
  }

  public void saveSignupRequest(SignupRequest req) {
    if (req == null || req.id() == null) return;
    try {
      redis.opsForValue().set(SIGNUP_REQUEST_PREFIX + req.id(), objectMapper.writeValueAsString(req));
      redis.opsForValue().set(SIGNUP_PENDING_PREFIX + req.chatId(), req.id().toString());
    } catch (JsonProcessingException e) {
      log.warn("Failed to save signup request {}", req.id(), e);
    }
  }

  public Optional<SignupRequest> getSignupRequest(UUID requestId) {
    if (requestId == null) return Optional.empty();
    try {
      String raw = redis.opsForValue().get(SIGNUP_REQUEST_PREFIX + requestId);
      if (raw == null || raw.isBlank()) return Optional.empty();
      return Optional.of(objectMapper.readValue(raw, SignupRequest.class));
    } catch (Exception ignored) {
      return Optional.empty();
    }
  }

  public void deleteSignupRequest(UUID requestId) {
    if (requestId == null) return;
    redis.delete(SIGNUP_REQUEST_PREFIX + requestId);
  }

  public Optional<UUID> getPendingSignupRequestId(long chatId) {
    if (chatId <= 0) return Optional.empty();
    try {
      String raw = redis.opsForValue().get(SIGNUP_PENDING_PREFIX + chatId);
      if (raw == null || raw.isBlank()) return Optional.empty();
      return Optional.of(UUID.fromString(raw.trim()));
    } catch (Exception ignored) {
      return Optional.empty();
    }
  }

  public void clearPendingSignupRequestId(long chatId) {
    if (chatId <= 0) return;
    redis.delete(SIGNUP_PENDING_PREFIX + chatId);
  }

  public void saveRequestWizard(AssetRequestWizard wizard) {
    if (wizard == null) return;
    try {
      redis.opsForValue().set(REQUEST_WIZARD_PREFIX + wizard.chatId(), objectMapper.writeValueAsString(wizard));
    } catch (JsonProcessingException e) {
      log.warn("Failed to save request wizard chatId={}", wizard.chatId(), e);
    }
  }

  public Optional<AssetRequestWizard> getRequestWizard(long chatId) {
    if (chatId <= 0) return Optional.empty();
    try {
      String raw = redis.opsForValue().get(REQUEST_WIZARD_PREFIX + chatId);
      if (raw == null || raw.isBlank()) return Optional.empty();
      return Optional.of(objectMapper.readValue(raw, AssetRequestWizard.class));
    } catch (Exception ignored) {
      return Optional.empty();
    }
  }

  public void deleteRequestWizard(long chatId) {
    if (chatId <= 0) return;
    redis.delete(REQUEST_WIZARD_PREFIX + chatId);
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

  public enum SignupWizardStep { FULL_NAME, JOB_TITLE, PHONE, CONFIRM }

  public record SignupWizard(
      long chatId,
      long telegramUserId,
      String telegramUsername,
      SignupWizardStep step,
      String fullName,
      String jobTitle,
      String phoneNumber,
      Instant createdAt
  ) {}

  public record SignupRequest(
      UUID id,
      long chatId,
      long telegramUserId,
      String telegramUsername,
      String fullName,
      String jobTitle,
      String phoneNumber,
      Instant createdAt
  ) {}

  public enum RequestWizardStep { CATEGORY, TYPE, TYPE_TEXT, QTY, CONFIRM }

  public record AssetRequestWizard(
      long chatId,
      UUID requesterUserId,
      String requesterUsername,
      List<String> requesterRoles,
      RequestWizardStep step,
      String categoryCode,
      String type,
      Integer quantity,
      Instant createdAt
  ) {}
}

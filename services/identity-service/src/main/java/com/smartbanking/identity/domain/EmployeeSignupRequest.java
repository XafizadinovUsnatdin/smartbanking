package com.smartbanking.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "employee_signup_requests")
public class EmployeeSignupRequest {
  @Id
  @Column(name = "id", nullable = false)
  private UUID id;

  @Column(name = "full_name", nullable = false, length = 200)
  private String fullName;

  @Column(name = "job_title", nullable = false, length = 120)
  private String jobTitle;

  @Column(name = "phone_number", nullable = false, length = 32)
  private String phoneNumber;

  @Column(name = "telegram_username", length = 120)
  private String telegramUsername;

  @Column(name = "telegram_user_id", nullable = false)
  private long telegramUserId;

  @Column(name = "telegram_chat_id", nullable = false)
  private long telegramChatId;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 20)
  private EmployeeSignupRequestStatus status;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "decided_at")
  private Instant decidedAt;

  @Column(name = "decided_by", length = 200)
  private String decidedBy;

  @Column(name = "decision_note", length = 1000)
  private String decisionNote;

  @Column(name = "created_user_id")
  private UUID createdUserId;

  protected EmployeeSignupRequest() {}

  public EmployeeSignupRequest(
      UUID id,
      String fullName,
      String jobTitle,
      String phoneNumber,
      String telegramUsername,
      long telegramUserId,
      long telegramChatId,
      EmployeeSignupRequestStatus status,
      Instant createdAt
  ) {
    this.id = id;
    this.fullName = fullName;
    this.jobTitle = jobTitle;
    this.phoneNumber = phoneNumber;
    this.telegramUsername = telegramUsername;
    this.telegramUserId = telegramUserId;
    this.telegramChatId = telegramChatId;
    this.status = status;
    this.createdAt = createdAt;
  }

  public UUID getId() { return id; }
  public String getFullName() { return fullName; }
  public String getJobTitle() { return jobTitle; }
  public String getPhoneNumber() { return phoneNumber; }
  public String getTelegramUsername() { return telegramUsername; }
  public long getTelegramUserId() { return telegramUserId; }
  public long getTelegramChatId() { return telegramChatId; }
  public EmployeeSignupRequestStatus getStatus() { return status; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getDecidedAt() { return decidedAt; }
  public String getDecidedBy() { return decidedBy; }
  public String getDecisionNote() { return decisionNote; }
  public UUID getCreatedUserId() { return createdUserId; }

  public void approve(String decidedBy, String decisionNote, UUID createdUserId, Instant decidedAt) {
    this.status = EmployeeSignupRequestStatus.APPROVED;
    this.decidedBy = decidedBy;
    this.decisionNote = decisionNote;
    this.createdUserId = createdUserId;
    this.decidedAt = decidedAt;
  }

  public void reject(String decidedBy, String decisionNote, Instant decidedAt) {
    this.status = EmployeeSignupRequestStatus.REJECTED;
    this.decidedBy = decidedBy;
    this.decisionNote = decisionNote;
    this.decidedAt = decidedAt;
  }
}


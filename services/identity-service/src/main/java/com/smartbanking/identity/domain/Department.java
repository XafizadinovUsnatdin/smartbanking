package com.smartbanking.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "departments")
public class Department {
  @Id
  @Column(name = "id", nullable = false)
  private UUID id;

  @Column(name = "name", nullable = false, length = 200)
  private String name;

  @Column(name = "branch_id")
  private UUID branchId;

  @Column(name = "phone_number", length = 32)
  private String phoneNumber;

  @Column(name = "telegram_username", length = 120)
  private String telegramUsername;

  @Column(name = "telegram_chat_id")
  private Long telegramChatId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  protected Department() {}

  public Department(UUID id, String name, UUID branchId, Instant createdAt) {
    this.id = id;
    this.name = name;
    this.branchId = branchId;
    this.createdAt = createdAt;
  }

  public UUID getId() { return id; }
  public String getName() { return name; }
  public UUID getBranchId() { return branchId; }
  public String getPhoneNumber() { return phoneNumber; }
  public String getTelegramUsername() { return telegramUsername; }
  public Long getTelegramChatId() { return telegramChatId; }
  public Instant getCreatedAt() { return createdAt; }

  public void setName(String name) { this.name = name; }
  public void setBranchId(UUID branchId) { this.branchId = branchId; }
  public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
  public void setTelegramUsername(String telegramUsername) { this.telegramUsername = telegramUsername; }
  public void setTelegramChatId(Long telegramChatId) { this.telegramChatId = telegramChatId; }
}

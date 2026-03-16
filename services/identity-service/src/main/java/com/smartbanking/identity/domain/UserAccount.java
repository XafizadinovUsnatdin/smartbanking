package com.smartbanking.identity.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "users")
public class UserAccount {
  @Id
  @Column(name = "id", nullable = false)
  private UUID id;

  @Column(name = "username", nullable = false, unique = true, length = 120)
  private String username;

  @Column(name = "password_hash", nullable = false, length = 200)
  private String passwordHash;

  @Column(name = "full_name", nullable = false, length = 200)
  private String fullName;

  @Column(name = "job_title", length = 120)
  private String jobTitle;

  @Column(name = "department_id")
  private UUID departmentId;

  @Column(name = "branch_id")
  private UUID branchId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "phone_number", length = 32)
  private String phoneNumber;

  @Column(name = "telegram_username", length = 120)
  private String telegramUsername;

  @Column(name = "telegram_user_id")
  private Long telegramUserId;

  @Column(name = "telegram_chat_id")
  private Long telegramChatId;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
  @Column(name = "role", nullable = false, length = 50)
  @Enumerated(EnumType.STRING)
  private Set<Role> roles = new HashSet<>();

  protected UserAccount() {}

  public UserAccount(
      UUID id,
      String username,
      String passwordHash,
      String fullName,
      String jobTitle,
      UUID departmentId,
      UUID branchId,
      Instant createdAt,
      String phoneNumber,
      String telegramUsername,
      Long telegramUserId,
      Long telegramChatId,
      Set<Role> roles
  ) {
    this.id = id;
    this.username = username;
    this.passwordHash = passwordHash;
    this.fullName = fullName;
    this.jobTitle = jobTitle;
    this.departmentId = departmentId;
    this.branchId = branchId;
    this.createdAt = createdAt;
    this.phoneNumber = phoneNumber;
    this.telegramUsername = telegramUsername;
    this.telegramUserId = telegramUserId;
    this.telegramChatId = telegramChatId;
    this.roles = roles == null ? new HashSet<>() : new HashSet<>(roles);
  }

  public UUID getId() { return id; }
  public String getUsername() { return username; }
  public String getPasswordHash() { return passwordHash; }
  public String getFullName() { return fullName; }
  public String getJobTitle() { return jobTitle; }
  public UUID getDepartmentId() { return departmentId; }
  public UUID getBranchId() { return branchId; }
  public Instant getCreatedAt() { return createdAt; }
  public String getPhoneNumber() { return phoneNumber; }
  public String getTelegramUsername() { return telegramUsername; }
  public Long getTelegramUserId() { return telegramUserId; }
  public Long getTelegramChatId() { return telegramChatId; }
  public Set<Role> getRoles() { return roles; }

  public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
  public void setFullName(String fullName) { this.fullName = fullName; }
  public void setJobTitle(String jobTitle) { this.jobTitle = jobTitle; }
  public void setDepartmentId(UUID departmentId) { this.departmentId = departmentId; }
  public void setBranchId(UUID branchId) { this.branchId = branchId; }
  public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
  public void setTelegramUsername(String telegramUsername) { this.telegramUsername = telegramUsername; }
  public void setTelegramUserId(Long telegramUserId) { this.telegramUserId = telegramUserId; }
  public void setTelegramChatId(Long telegramChatId) { this.telegramChatId = telegramChatId; }
  public void setRoles(Set<Role> roles) { this.roles = roles == null ? new HashSet<>() : new HashSet<>(roles); }
}

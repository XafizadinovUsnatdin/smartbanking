package com.smartbanking.asset.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "asset_requests")
public class AssetRequest {
  @Id
  @Column(name = "id", nullable = false)
  private UUID id;

  @Column(name = "requester_id", nullable = false)
  private UUID requesterId;

  @Column(name = "requester_username", nullable = false, length = 120)
  private String requesterUsername;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 50)
  private AssetRequestStatus status;

  @Column(name = "note", length = 1000)
  private String note;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "decided_at")
  private Instant decidedAt;

  @Column(name = "decided_by", length = 120)
  private String decidedBy;

  @Column(name = "decision_note", length = 1000)
  private String decisionNote;

  protected AssetRequest() {}

  public AssetRequest(UUID id, UUID requesterId, String requesterUsername, AssetRequestStatus status, String note, Instant createdAt, Instant updatedAt) {
    this.id = id;
    this.requesterId = requesterId;
    this.requesterUsername = requesterUsername;
    this.status = status;
    this.note = note;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public UUID getId() { return id; }
  public UUID getRequesterId() { return requesterId; }
  public String getRequesterUsername() { return requesterUsername; }
  public AssetRequestStatus getStatus() { return status; }
  public String getNote() { return note; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public Instant getDecidedAt() { return decidedAt; }
  public String getDecidedBy() { return decidedBy; }
  public String getDecisionNote() { return decisionNote; }

  public void setNote(String note) {
    this.note = note;
    touchUpdatedAt();
  }

  public void decide(AssetRequestStatus status, String decidedBy, String decisionNote) {
    this.status = status;
    this.decidedAt = Instant.now();
    this.decidedBy = decidedBy;
    this.decisionNote = decisionNote;
    touchUpdatedAt();
  }

  public void touchUpdatedAt() {
    this.updatedAt = Instant.now();
  }
}


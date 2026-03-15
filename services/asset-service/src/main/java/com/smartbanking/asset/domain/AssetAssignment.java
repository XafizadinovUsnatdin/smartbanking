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
@Table(name = "asset_assignments")
public class AssetAssignment {
  @Id
  @Column(name = "id", nullable = false)
  private UUID id;

  @Column(name = "asset_id", nullable = false)
  private UUID assetId;

  @Enumerated(EnumType.STRING)
  @Column(name = "owner_type", nullable = false, length = 50)
  private OwnerType ownerType;

  @Column(name = "owner_id", nullable = false)
  private UUID ownerId;

  @Column(name = "assigned_at", nullable = false)
  private Instant assignedAt;

  @Column(name = "assigned_by", nullable = false, length = 120)
  private String assignedBy;

  @Column(name = "assign_reason", length = 400)
  private String assignReason;

  @Column(name = "returned_at")
  private Instant returnedAt;

  @Column(name = "returned_by", length = 120)
  private String returnedBy;

  @Column(name = "return_reason", length = 400)
  private String returnReason;

  protected AssetAssignment() {}

  public AssetAssignment(UUID id, UUID assetId, OwnerType ownerType, UUID ownerId, Instant assignedAt, String assignedBy, String assignReason) {
    this.id = id;
    this.assetId = assetId;
    this.ownerType = ownerType;
    this.ownerId = ownerId;
    this.assignedAt = assignedAt;
    this.assignedBy = assignedBy;
    this.assignReason = assignReason;
  }

  public UUID getId() { return id; }
  public UUID getAssetId() { return assetId; }
  public OwnerType getOwnerType() { return ownerType; }
  public UUID getOwnerId() { return ownerId; }
  public Instant getAssignedAt() { return assignedAt; }
  public String getAssignedBy() { return assignedBy; }
  public String getAssignReason() { return assignReason; }
  public Instant getReturnedAt() { return returnedAt; }
  public String getReturnedBy() { return returnedBy; }
  public String getReturnReason() { return returnReason; }

  public boolean isActive() { return returnedAt == null; }

  public void markReturned(String returnedBy, String returnReason) {
    this.returnedAt = Instant.now();
    this.returnedBy = returnedBy;
    this.returnReason = returnReason;
  }
}


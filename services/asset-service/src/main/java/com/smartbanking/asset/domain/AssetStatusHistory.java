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
@Table(name = "asset_status_history")
public class AssetStatusHistory {
  @Id
  @Column(name = "id", nullable = false)
  private UUID id;

  @Column(name = "asset_id", nullable = false)
  private UUID assetId;

  @Enumerated(EnumType.STRING)
  @Column(name = "from_status", nullable = false, length = 50)
  private AssetStatus fromStatus;

  @Enumerated(EnumType.STRING)
  @Column(name = "to_status", nullable = false, length = 50)
  private AssetStatus toStatus;

  @Column(name = "reason", length = 400)
  private String reason;

  @Column(name = "changed_by", nullable = false, length = 120)
  private String changedBy;

  @Column(name = "changed_at", nullable = false)
  private Instant changedAt;

  protected AssetStatusHistory() {}

  public AssetStatusHistory(UUID id, UUID assetId, AssetStatus fromStatus, AssetStatus toStatus, String reason, String changedBy, Instant changedAt) {
    this.id = id;
    this.assetId = assetId;
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
    this.reason = reason;
    this.changedBy = changedBy;
    this.changedAt = changedAt;
  }

  public UUID getId() { return id; }
  public UUID getAssetId() { return assetId; }
  public AssetStatus getFromStatus() { return fromStatus; }
  public AssetStatus getToStatus() { return toStatus; }
  public String getReason() { return reason; }
  public String getChangedBy() { return changedBy; }
  public Instant getChangedAt() { return changedAt; }
}

package com.smartbanking.asset.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "inventory_scans")
public class InventoryScan {
  @Id
  @Column(name = "id", nullable = false)
  private UUID id;

  @Column(name = "session_id", nullable = false)
  private UUID sessionId;

  @Column(name = "asset_id", nullable = false)
  private UUID assetId;

  @Column(name = "scanned_at", nullable = false)
  private Instant scannedAt;

  @Column(name = "scanned_by", nullable = false, length = 120)
  private String scannedBy;

  @Column(name = "note", length = 400)
  private String note;

  protected InventoryScan() {}

  public InventoryScan(UUID id, UUID sessionId, UUID assetId, Instant scannedAt, String scannedBy, String note) {
    this.id = id;
    this.sessionId = sessionId;
    this.assetId = assetId;
    this.scannedAt = scannedAt;
    this.scannedBy = scannedBy;
    this.note = note;
  }

  public UUID getId() { return id; }
  public UUID getSessionId() { return sessionId; }
  public UUID getAssetId() { return assetId; }
  public Instant getScannedAt() { return scannedAt; }
  public String getScannedBy() { return scannedBy; }
  public String getNote() { return note; }
}


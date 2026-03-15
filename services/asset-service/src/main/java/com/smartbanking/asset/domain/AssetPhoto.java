package com.smartbanking.asset.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "asset_photos")
public class AssetPhoto {
  @Id
  @Column(name = "id", nullable = false)
  private UUID id;

  @Column(name = "asset_id", nullable = false)
  private UUID assetId;

  @Column(name = "filename", nullable = false, length = 255)
  private String filename;

  @Column(name = "content_type", nullable = false, length = 120)
  private String contentType;

  @Column(name = "size_bytes", nullable = false)
  private long sizeBytes;

  @Column(name = "storage_path", nullable = false, length = 500)
  private String storagePath;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "created_by", nullable = false, length = 120)
  private String createdBy;

  protected AssetPhoto() {}

  public AssetPhoto(UUID id, UUID assetId, String filename, String contentType, long sizeBytes, String storagePath, Instant createdAt, String createdBy) {
    this.id = id;
    this.assetId = assetId;
    this.filename = filename;
    this.contentType = contentType;
    this.sizeBytes = sizeBytes;
    this.storagePath = storagePath;
    this.createdAt = createdAt;
    this.createdBy = createdBy;
  }

  public UUID getId() { return id; }
  public UUID getAssetId() { return assetId; }
  public String getFilename() { return filename; }
  public String getContentType() { return contentType; }
  public long getSizeBytes() { return sizeBytes; }
  public String getStoragePath() { return storagePath; }
  public Instant getCreatedAt() { return createdAt; }
  public String getCreatedBy() { return createdBy; }
}


package com.smartbanking.asset.domain;

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
@Table(name = "inventory_sessions")
public class InventorySession {
  @Id
  @Column(name = "id", nullable = false)
  private UUID id;

  @Column(name = "name", nullable = false, length = 200)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(name = "owner_type", nullable = false, length = 50)
  private OwnerType ownerType;

  @Column(name = "owner_id", nullable = false)
  private UUID ownerId;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 50)
  private InventorySessionStatus status;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "created_by", nullable = false, length = 120)
  private String createdBy;

  @Column(name = "closed_at")
  private Instant closedAt;

  @Column(name = "closed_by", length = 120)
  private String closedBy;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "inventory_expected_assets", joinColumns = @JoinColumn(name = "session_id"))
  @Column(name = "asset_id", nullable = false)
  private Set<UUID> expectedAssetIds = new HashSet<>();

  protected InventorySession() {}

  public InventorySession(UUID id,
                          String name,
                          OwnerType ownerType,
                          UUID ownerId,
                          InventorySessionStatus status,
                          Instant createdAt,
                          String createdBy) {
    this.id = id;
    this.name = name;
    this.ownerType = ownerType;
    this.ownerId = ownerId;
    this.status = status;
    this.createdAt = createdAt;
    this.createdBy = createdBy;
  }

  public UUID getId() { return id; }
  public String getName() { return name; }
  public OwnerType getOwnerType() { return ownerType; }
  public UUID getOwnerId() { return ownerId; }
  public InventorySessionStatus getStatus() { return status; }
  public Instant getCreatedAt() { return createdAt; }
  public String getCreatedBy() { return createdBy; }
  public Instant getClosedAt() { return closedAt; }
  public String getClosedBy() { return closedBy; }
  public Set<UUID> getExpectedAssetIds() { return expectedAssetIds; }

  public void setExpectedAssetIds(Set<UUID> expectedAssetIds) {
    this.expectedAssetIds = expectedAssetIds == null ? new HashSet<>() : expectedAssetIds;
  }

  public void close(String actor) {
    if (this.status == InventorySessionStatus.CLOSED) {
      return;
    }
    this.status = InventorySessionStatus.CLOSED;
    this.closedAt = Instant.now();
    this.closedBy = actor;
  }
}

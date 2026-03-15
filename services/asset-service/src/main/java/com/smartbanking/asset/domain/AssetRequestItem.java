package com.smartbanking.asset.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "asset_request_items")
public class AssetRequestItem {
  @Id
  @Column(name = "id", nullable = false)
  private UUID id;

  @Column(name = "request_id", nullable = false)
  private UUID requestId;

  @Column(name = "asset_type", nullable = false, length = 120)
  private String assetType;

  @Column(name = "category_code", nullable = false, length = 50)
  private String categoryCode;

  @Column(name = "quantity", nullable = false)
  private int quantity;

  protected AssetRequestItem() {}

  public AssetRequestItem(UUID id, UUID requestId, String assetType, String categoryCode, int quantity) {
    this.id = id;
    this.requestId = requestId;
    this.assetType = assetType;
    this.categoryCode = categoryCode;
    this.quantity = quantity;
  }

  public UUID getId() { return id; }
  public UUID getRequestId() { return requestId; }
  public String getAssetType() { return assetType; }
  public String getCategoryCode() { return categoryCode; }
  public int getQuantity() { return quantity; }
}


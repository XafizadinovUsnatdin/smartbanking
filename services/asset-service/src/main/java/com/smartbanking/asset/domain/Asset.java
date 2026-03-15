package com.smartbanking.asset.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "assets")
public class Asset {
  @Id
  @Column(name = "id", nullable = false)
  private UUID id;

  @Column(name = "name", nullable = false, length = 200)
  private String name;

  @Column(name = "type", nullable = false, length = 120)
  private String type;

  @Column(name = "category_code", nullable = false, length = 50)
  private String categoryCode;

  @Column(name = "serial_number", nullable = false, length = 120, unique = true)
  private String serialNumber;

  @Column(name = "description", length = 1000)
  private String description;

  @Column(name = "inventory_tag", length = 120, unique = true)
  private String inventoryTag;

  @Column(name = "model", length = 120)
  private String model;

  @Column(name = "vendor", length = 120)
  private String vendor;

  @Column(name = "purchase_date")
  private LocalDate purchaseDate;

  @Column(name = "warranty_until")
  private LocalDate warrantyUntil;

  @Column(name = "cost", precision = 19, scale = 2)
  private BigDecimal cost;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 50)
  private AssetStatus status;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "deleted_at")
  private Instant deletedAt;

  @Column(name = "deleted_by", length = 120)
  private String deletedBy;

  @Column(name = "delete_reason", length = 400)
  private String deleteReason;

  protected Asset() {}

  public Asset(UUID id, String name, String type, String categoryCode, String serialNumber, String description, String inventoryTag,
               String model, String vendor, LocalDate purchaseDate, LocalDate warrantyUntil, BigDecimal cost,
               AssetStatus status, Instant createdAt, Instant updatedAt) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.categoryCode = categoryCode;
    this.serialNumber = serialNumber;
    this.description = description;
    this.inventoryTag = inventoryTag;
    this.model = model;
    this.vendor = vendor;
    this.purchaseDate = purchaseDate;
    this.warrantyUntil = warrantyUntil;
    this.cost = cost;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public UUID getId() { return id; }
  public String getName() { return name; }
  public String getType() { return type; }
  public String getCategoryCode() { return categoryCode; }
  public String getSerialNumber() { return serialNumber; }
  public String getDescription() { return description; }
  public String getInventoryTag() { return inventoryTag; }
  public String getModel() { return model; }
  public String getVendor() { return vendor; }
  public LocalDate getPurchaseDate() { return purchaseDate; }
  public LocalDate getWarrantyUntil() { return warrantyUntil; }
  public BigDecimal getCost() { return cost; }
  public AssetStatus getStatus() { return status; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }

  public void setName(String name) { this.name = name; }
  public void setType(String type) { this.type = type; }
  public void setCategoryCode(String categoryCode) { this.categoryCode = categoryCode; }
  public void setDescription(String description) { this.description = description; }
  public void setInventoryTag(String inventoryTag) { this.inventoryTag = inventoryTag; }
  public void setModel(String model) { this.model = model; }
  public void setVendor(String vendor) { this.vendor = vendor; }
  public void setPurchaseDate(LocalDate purchaseDate) { this.purchaseDate = purchaseDate; }
  public void setWarrantyUntil(LocalDate warrantyUntil) { this.warrantyUntil = warrantyUntil; }
  public void setCost(BigDecimal cost) { this.cost = cost; }
  public void setStatus(AssetStatus status) { this.status = status; }
  public void touchUpdatedAt() { this.updatedAt = Instant.now(); }

  public void markDeleted(String deletedBy, String deleteReason) {
    if (this.deletedAt != null) {
      return;
    }
    this.deletedAt = Instant.now();
    this.deletedBy = deletedBy;
    this.deleteReason = deleteReason;
    touchUpdatedAt();
  }
}

package com.smartbanking.analytics.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "asset_category_counts")
public class AssetCategoryCount {
  @Id
  @Column(name = "category_code", nullable = false, length = 50)
  private String categoryCode;

  @Column(name = "cnt", nullable = false)
  private long count;

  protected AssetCategoryCount() {}

  public AssetCategoryCount(String categoryCode, long count) {
    this.categoryCode = categoryCode;
    this.count = count;
  }

  public String getCategoryCode() { return categoryCode; }
  public long getCount() { return count; }
  public void setCount(long count) { this.count = count; }
}


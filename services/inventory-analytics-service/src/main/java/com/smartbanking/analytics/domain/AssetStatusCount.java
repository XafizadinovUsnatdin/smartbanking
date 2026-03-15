package com.smartbanking.analytics.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "asset_status_counts")
public class AssetStatusCount {
  @Id
  @Column(name = "status", nullable = false, length = 50)
  private String status;

  @Column(name = "cnt", nullable = false)
  private long count;

  protected AssetStatusCount() {}

  public AssetStatusCount(String status, long count) {
    this.status = status;
    this.count = count;
  }

  public String getStatus() { return status; }
  public long getCount() { return count; }
  public void setCount(long count) { this.count = count; }
}


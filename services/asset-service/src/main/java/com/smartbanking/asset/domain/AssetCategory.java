package com.smartbanking.asset.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "asset_categories")
public class AssetCategory {
  @Id
  @Column(name = "code", nullable = false, length = 50)
  private String code;

  @Column(name = "name", nullable = false, length = 120)
  private String name;

  protected AssetCategory() {}

  public AssetCategory(String code, String name) {
    this.code = code;
    this.name = name;
  }

  public String getCode() { return code; }
  public String getName() { return name; }
}


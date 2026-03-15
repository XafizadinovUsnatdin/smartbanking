package com.smartbanking.asset.domain;

public enum AssetStatus {
  REGISTERED,
  ASSIGNED,
  IN_REPAIR,
  LOST,
  WRITTEN_OFF;

  public boolean isTerminal() {
    return this == LOST || this == WRITTEN_OFF;
  }
}


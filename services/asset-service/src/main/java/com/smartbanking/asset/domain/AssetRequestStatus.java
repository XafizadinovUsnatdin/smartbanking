package com.smartbanking.asset.domain;

public enum AssetRequestStatus {
  SUBMITTED,
  APPROVED,
  REJECTED,
  FULFILLED,
  CANCELLED;

  public boolean isTerminal() {
    return this == REJECTED || this == FULFILLED || this == CANCELLED;
  }
}


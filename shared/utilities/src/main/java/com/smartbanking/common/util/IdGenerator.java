package com.smartbanking.common.util;

import java.util.UUID;

public final class IdGenerator {
  private IdGenerator() {}

  public static UUID newUuid() {
    return UUID.randomUUID();
  }
}


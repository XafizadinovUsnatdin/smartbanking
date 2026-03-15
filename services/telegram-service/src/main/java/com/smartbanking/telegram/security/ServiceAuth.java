package com.smartbanking.telegram.security;

import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ServiceAuth {
  private static final UUID SERVICE_ID = UUID.fromString("00000000-0000-0000-0000-000000000006");
  private static final String SERVICE_USERNAME = "telegram-service";
  private static final List<String> SERVICE_ROLES = List.of("ASSET_MANAGER");

  private final JwtIssuer jwtIssuer;

  public ServiceAuth(JwtIssuer jwtIssuer) {
    this.jwtIssuer = jwtIssuer;
  }

  public String serviceToken() {
    return jwtIssuer.issueAccessToken(SERVICE_ID, SERVICE_USERNAME, SERVICE_ROLES, Duration.ofHours(2));
  }

  public String asUserToken(UUID userId, String username, List<String> roles) {
    return jwtIssuer.issueAccessToken(userId, username, roles, Duration.ofMinutes(30));
  }
}


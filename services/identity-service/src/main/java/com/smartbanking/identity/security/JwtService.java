package com.smartbanking.identity.security;

import com.smartbanking.identity.domain.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Set;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private final SecretKey signingKey;
  private final Duration accessTtl;
  private final Duration refreshTtl;

  public JwtService(
      @Value("${security.jwt.secret}") String secret,
      @Value("${security.jwt.access-ttl}") Duration accessTtl,
      @Value("${security.jwt.refresh-ttl}") Duration refreshTtl
  ) {
    this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.accessTtl = accessTtl;
    this.refreshTtl = refreshTtl;
  }

  public String issueAccessToken(UUID userId, String username, Set<Role> roles) {
    return issueToken("access", userId, username, roles, accessTtl);
  }

  public String issueRefreshToken(UUID userId, String username, Set<Role> roles) {
    return issueToken("refresh", userId, username, roles, refreshTtl);
  }

  private String issueToken(String type, UUID userId, String username, Set<Role> roles, Duration ttl) {
    Instant now = Instant.now();
    Instant exp = now.plus(ttl);
    return Jwts.builder()
        .subject(userId.toString())
        .claim("typ", type)
        .claim("usr", username)
        .claim("roles", roles.stream().map(Enum::name).toList())
        .issuedAt(Date.from(now))
        .expiration(Date.from(exp))
        .signWith(signingKey)
        .compact();
  }

  public Claims parse(String jwt) {
    return Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(jwt).getPayload();
  }
}


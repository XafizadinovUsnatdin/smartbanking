package com.smartbanking.telegram.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtIssuer {
  private final SecretKey signingKey;

  public JwtIssuer(@Value("${security.jwt.secret}") String secret) {
    this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
  }

  public String issueAccessToken(UUID userId, String username, List<String> roles, Duration ttl) {
    Instant now = Instant.now();
    Instant exp = now.plus(ttl);
    return Jwts.builder()
        .subject(userId.toString())
        .claim("typ", "access")
        .claim("usr", username)
        .claim("roles", roles == null ? List.of() : roles)
        .issuedAt(Date.from(now))
        .expiration(Date.from(exp))
        .signWith(signingKey)
        .compact();
  }
}


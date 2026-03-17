package com.smartbanking.qr.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ServiceTokenProvider {
  private final SecretKey key;
  private final Duration ttl;

  public ServiceTokenProvider(
      @Value("${security.jwt.secret}") String secret,
      @Value("${security.jwt.service-ttl:PT30M}") Duration ttl
  ) {
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.ttl = ttl == null || ttl.isNegative() || ttl.isZero() ? Duration.ofMinutes(30) : ttl;
  }

  public String issue() {
    Instant now = Instant.now();
    return Jwts.builder()
        .setSubject("qr-service")
        .claim("usr", "qr-service")
        .claim("roles", List.of("AUDITOR"))
        .claim("typ", "access")
        .setIssuedAt(Date.from(now))
        .setExpiration(Date.from(now.plus(ttl)))
        .signWith(key, SignatureAlgorithm.HS256)
        .compact();
  }
}

package com.smartbanking.qr.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class QrTokenService {
  private final StringRedisTemplate redis;
  private final byte[] secret;
  private final Duration ttl;

  public QrTokenService(StringRedisTemplate redis,
                        @Value("${qr.secret}") String secret,
                        @Value("${qr.ttl}") Duration ttl) {
    this.redis = redis;
    this.secret = secret.getBytes(StandardCharsets.UTF_8);
    this.ttl = ttl;
  }

  public String issueToken(UUID assetId) {
    UUID existing = existingTokenId(assetId);
    if (existing != null) {
      String cachedAsset = redis.opsForValue().get(key(existing));
      if (assetId.toString().equals(cachedAsset)) {
        redis.expire(key(existing), ttl);
        redis.expire(assetKey(assetId), ttl);
        return sign(existing, assetId);
      }
    }

    UUID tokenId = UUID.randomUUID();
    redis.opsForValue().set(key(tokenId), assetId.toString(), ttl);
    redis.opsForValue().set(assetKey(assetId), tokenId.toString(), ttl);
    return sign(tokenId, assetId);
  }

  public UUID resolveAssetId(String token) {
    String[] parts = token.split("\\.", 2);
    if (parts.length != 2) {
      throw new IllegalArgumentException("Invalid token format");
    }
    String payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
    String sig = parts[1];
    if (!MessageDigest.isEqual(sig.getBytes(StandardCharsets.UTF_8), hmac(payload).getBytes(StandardCharsets.UTF_8))) {
      throw new IllegalArgumentException("Invalid token signature");
    }
    String tokenId = payload.split(":", 2)[0];
    String assetId = redis.opsForValue().get(key(UUID.fromString(tokenId)));
    if (assetId == null) {
      throw new IllegalArgumentException("Token expired");
    }
    return UUID.fromString(assetId);
  }

  private String key(UUID tokenId) {
    return "qr:token:" + tokenId;
  }

  private String assetKey(UUID assetId) {
    return "qr:asset:" + assetId;
  }

  private UUID existingTokenId(UUID assetId) {
    String tokenId = redis.opsForValue().get(assetKey(assetId));
    if (tokenId == null || tokenId.isBlank()) return null;
    try {
      return UUID.fromString(tokenId);
    } catch (IllegalArgumentException e) {
      return null;
    }
  }

  private String sign(UUID tokenId, UUID assetId) {
    String payload = tokenId + ":" + assetId;
    String sig = hmac(payload);
    return base64Url(payload) + "." + sig;
  }

  private String base64Url(String s) {
    return Base64.getUrlEncoder().withoutPadding().encodeToString(s.getBytes(StandardCharsets.UTF_8));
  }

  private String hmac(String payload) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret, "HmacSHA256"));
      byte[] out = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
      return Base64.getUrlEncoder().withoutPadding().encodeToString(out);
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }
}

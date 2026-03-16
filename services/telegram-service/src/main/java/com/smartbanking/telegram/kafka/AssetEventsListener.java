package com.smartbanking.telegram.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbanking.common.events.EventEnvelope;
import com.smartbanking.telegram.clients.AssetClient;
import com.smartbanking.telegram.clients.IdentityClient;
import com.smartbanking.telegram.clients.dto.Asset;
import com.smartbanking.telegram.clients.dto.IdentityUser;
import com.smartbanking.telegram.telegram.TelegramClient;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class AssetEventsListener {
  private static final Logger log = LoggerFactory.getLogger(AssetEventsListener.class);

  private final ObjectMapper objectMapper;
  private final TelegramClient telegram;
  private final IdentityClient identity;
  private final AssetClient assets;

  public AssetEventsListener(ObjectMapper objectMapper, TelegramClient telegram, IdentityClient identity, AssetClient assets) {
    this.objectMapper = objectMapper;
    this.telegram = telegram;
    this.identity = identity;
    this.assets = assets;
  }

  @KafkaListener(
      topics = "${kafka.topics.asset-events:asset.events}",
      groupId = "telegram-service",
      autoStartup = "${kafka.listeners.enabled:true}"
  )
  public void onMessage(String json) throws Exception {
    if (!telegram.isEnabled()) return;
    if (json == null || json.isBlank()) return;

    EventEnvelope env = objectMapper.readValue(json, EventEnvelope.class);
    if ("AssetAssigned".equals(env.eventType())) {
      onAssetAssigned(env);
      return;
    }
    if ("AssetRequestStatusChanged".equals(env.eventType())) {
      onAssetRequestStatusChanged(env);
    }
  }

  private void onAssetAssigned(EventEnvelope env) {
    Map<String, Object> p = env.payload();
    if (p == null) return;

    String ownerType = p.get("ownerType") == null ? "" : String.valueOf(p.get("ownerType"));
    if (!"EMPLOYEE".equalsIgnoreCase(ownerType)) return;

    UUID ownerId;
    UUID assetId;
    try {
      ownerId = UUID.fromString(String.valueOf(p.get("ownerId")));
      assetId = UUID.fromString(String.valueOf(p.get("assetId")));
    } catch (Exception ignored) {
      return;
    }

    IdentityUser user;
    try {
      user = identity.getUser(ownerId);
    } catch (Exception e) {
      return;
    }
    if (user == null || user.telegramChatId() == null) return;

    Asset asset;
    try {
      asset = assets.getAsset(assetId);
    } catch (Exception e) {
      return;
    }

    String text = "Sizga yangi aktiv biriktirildi:\n"
        + safe(asset.name()) + " (" + safe(asset.serialNumber()) + ")";
    telegram.sendMessage(user.telegramChatId(), text);
  }

  private void onAssetRequestStatusChanged(EventEnvelope env) {
    Map<String, Object> p = env.payload();
    if (p == null) return;

    String entityType = p.get("entityType") == null ? "" : String.valueOf(p.get("entityType"));
    if (!"ASSET_REQUEST".equalsIgnoreCase(entityType)) return;

    UUID requesterId;
    try {
      requesterId = UUID.fromString(String.valueOf(p.get("requesterId")));
    } catch (Exception ignored) {
      return;
    }

    IdentityUser user;
    try {
      user = identity.getUser(requesterId);
    } catch (Exception e) {
      return;
    }
    if (user == null || user.telegramChatId() == null) return;

    String status = p.get("status") == null ? "" : String.valueOf(p.get("status")).trim().toUpperCase();
    String note = p.get("decisionNote") == null ? null : String.valueOf(p.get("decisionNote"));

    String header = switch (status) {
      case "APPROVED" -> "So'rovingiz tasdiqlandi.";
      case "REJECTED" -> "So'rovingiz rad etildi.";
      case "FULFILLED" -> "So'rovingiz bajarildi.";
      case "CANCELLED" -> "So'rovingiz bekor qilindi.";
      default -> null;
    };

    if (header == null) return;
    String text = header;
    if (note != null && !note.isBlank()) {
      text = text + "\n\nIzoh: " + note.trim();
    }
    telegram.sendMessage(user.telegramChatId(), text);
  }

  private static String safe(String s) {
    return s == null ? "-" : s;
  }
}

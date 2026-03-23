package com.smartbanking.telegram.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbanking.common.events.EventEnvelope;
import com.smartbanking.telegram.clients.AssetClient;
import com.smartbanking.telegram.clients.IdentityClient;
import com.smartbanking.telegram.clients.dto.Asset;
import com.smartbanking.telegram.clients.dto.AssetPhoto;
import com.smartbanking.telegram.clients.dto.IdentityDepartment;
import com.smartbanking.telegram.clients.dto.IdentityUser;
import com.smartbanking.telegram.telegram.TelegramClient;
import com.smartbanking.telegram.telegram.TelegramModels.InlineKeyboardButton;
import com.smartbanking.telegram.telegram.TelegramModels.InlineKeyboardMarkup;
import java.util.List;
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

    UUID ownerId;
    UUID assetId;
    try {
      ownerId = UUID.fromString(String.valueOf(p.get("ownerId")));
      assetId = UUID.fromString(String.valueOf(p.get("assetId")));
    } catch (Exception ignored) {
      return;
    }

    Long chatId = null;
    String ownerLabel = null;
    boolean interactive = false;

    if ("EMPLOYEE".equalsIgnoreCase(ownerType)) {
      try {
        IdentityUser user = identity.getUser(ownerId);
        if (user != null) {
          chatId = user.telegramChatId();
          ownerLabel = user.fullName();
          interactive = true;
        }
      } catch (Exception ignored) {
        return;
      }
    } else if ("DEPARTMENT".equalsIgnoreCase(ownerType)) {
      try {
        IdentityDepartment dept = identity.getDepartment(ownerId);
        if (dept != null) {
          chatId = dept.telegramChatId();
          ownerLabel = dept.name();
          interactive = false;
        }
      } catch (Exception ignored) {
        return;
      }
    } else {
      return;
    }

    if (chatId == null) return;

    Asset asset;
    try {
      asset = assets.getAsset(assetId);
    } catch (Exception e) {
      return;
    }

    sendAssignedNotification(chatId, ownerType, ownerLabel, asset, interactive);
  }

  private void sendAssignedNotification(long chatId, String ownerType, String ownerLabel, Asset asset, boolean interactive) {
    if (asset == null) return;

    String header = "📌 Yangi aktiv biriktirildi";
    if ("DEPARTMENT".equalsIgnoreCase(ownerType) && ownerLabel != null && !ownerLabel.isBlank()) {
      header = header + " (" + ownerLabel.trim() + ")";
    }

    String caption = header + "\n\n"
        + "📦 " + safe(asset.name()) + "\n"
        + "🔖 Serial: " + safe(asset.serialNumber()) + "\n"
        + "🏷️ Turi: " + safe(asset.type()) + "\n"
        + "🗂️ Kategoriya: " + safe(asset.categoryCode()) + "\n"
        + "📌 Status: " + statusLabel(asset.status());

    if (interactive) {
      caption = caption + "\n\nKo'rish: /myassets";
    }

    InlineKeyboardMarkup kb = null;
    String status = asset.status() == null ? "" : asset.status().trim().toUpperCase();
    boolean terminal = "LOST".equals(status) || "WRITTEN_OFF".equals(status);
    if (interactive && !terminal) {
      kb = new InlineKeyboardMarkup(List.of(
          List.of(
              new InlineKeyboardButton("✅ Ishlayapti", "chk:ok:" + asset.id()),
              new InlineKeyboardButton("⚠️ Buzilgan", "iss:broken:" + asset.id())
          ),
          List.of(
              new InlineKeyboardButton("🛠 Tamirtalab", "iss:repair:" + asset.id()),
              new InlineKeyboardButton("❌ Yo'qolgan", "iss:lost:" + asset.id())
          )
      ));
    }

    try {
      List<AssetPhoto> photos = assets.listPhotos(asset.id());
      AssetPhoto first = photos == null || photos.isEmpty() ? null : photos.get(0);
      if (first != null) {
        var download = assets.downloadPhoto(first.id());
        if (download != null && download.bytes().length > 0) {
          telegram.sendPhoto(chatId, download.bytes(), first.filename(), caption, kb);
          return;
        }
      }
    } catch (Exception e) {
      log.debug("Telegram assignment photo send failed assetId={}", asset.id(), e);
    }

    telegram.sendMessage(chatId, caption, kb);
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

  private static String statusLabel(String raw) {
    if (raw == null || raw.isBlank()) return "-";
    String s = raw.trim().toUpperCase();
    return switch (s) {
      case "REGISTERED" -> "Ro'yxatga olingan";
      case "ASSIGNED" -> "Biriktirilgan";
      case "IN_REPAIR" -> "Ta'mirda";
      case "LOST" -> "Yo'qolgan";
      case "WRITTEN_OFF" -> "Hisobdan chiqarilgan";
      default -> raw.trim();
    };
  }
}

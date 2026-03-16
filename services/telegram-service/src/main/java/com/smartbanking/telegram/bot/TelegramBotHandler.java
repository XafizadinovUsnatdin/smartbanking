package com.smartbanking.telegram.bot;

import com.smartbanking.telegram.bot.BotStateRepository.IssueReport;
import com.smartbanking.telegram.clients.AssetClient;
import com.smartbanking.telegram.clients.AssetClient.CreateAssetRequest;
import com.smartbanking.telegram.clients.AssetClient.CreateAssetRequestItem;
import com.smartbanking.telegram.clients.IdentityClient;
import com.smartbanking.telegram.clients.dto.Asset;
import com.smartbanking.telegram.clients.dto.AssignedAsset;
import com.smartbanking.telegram.clients.dto.IdentityUser;
import com.smartbanking.telegram.clients.dto.PageResponse;
import com.smartbanking.telegram.security.ServiceAuth;
import com.smartbanking.telegram.telegram.TelegramClient;
import com.smartbanking.telegram.telegram.TelegramModels;
import com.smartbanking.telegram.telegram.TelegramModels.InlineKeyboardButton;
import com.smartbanking.telegram.telegram.TelegramModels.InlineKeyboardMarkup;
import com.smartbanking.telegram.telegram.TelegramModels.Update;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class TelegramBotHandler {
  private static final Logger log = LoggerFactory.getLogger(TelegramBotHandler.class);
  private static final int MY_ASSETS_LIMIT = 25;

  private final TelegramClient telegram;
  private final IdentityClient identity;
  private final AssetClient assets;
  private final ServiceAuth auth;
  private final BotStateRepository state;

  public TelegramBotHandler(TelegramClient telegram, IdentityClient identity, AssetClient assets, ServiceAuth auth, BotStateRepository state) {
    this.telegram = telegram;
    this.identity = identity;
    this.assets = assets;
    this.auth = auth;
    this.state = state;
  }

  public void handle(Update update) {
    if (update == null) return;
    if (update.callbackQuery() != null) {
      handleCallback(update.callbackQuery());
      return;
    }
    if (update.message() != null) {
      handleMessage(update.message());
    }
  }

  private void handleMessage(TelegramModels.Message msg) {
    String text = msg.text();
    long chatId = msg.chat() == null ? 0 : msg.chat().id();
    if (chatId == 0) return;

    if (text == null || text.isBlank()) {
      telegram.sendMessage(chatId, helpText());
      return;
    }
    String trimmed = text.trim();
    String cmd = trimmed.split("\\s+", 2)[0];
    if (cmd.contains("@")) {
      cmd = cmd.substring(0, cmd.indexOf('@'));
    }

    switch (cmd) {
      case "/start" -> onStart(msg);
      case "/help" -> telegram.sendMessage(chatId, helpText());
      case "/myassets" -> onMyAssets(msg);
      case "/request" -> onRequest(msg);
      default -> telegram.sendMessage(chatId, helpText());
    }
  }

  private void onStart(TelegramModels.Message msg) {
    long chatId = msg.chat().id();
    TelegramModels.From from = msg.from();
    Optional<IdentityUser> userOpt = resolveAndLink(from, chatId);
    if (userOpt.isEmpty()) {
      telegram.sendMessage(chatId, "Hisob topilmadi. Administratorga murojaat qiling.");
      return;
    }
    IdentityUser user = userOpt.get();
    telegram.sendMessage(chatId, "Assalomu alaykum, " + safe(user.fullName()) + ".\n\nSizga biriktirilgan aktivlar ro'yxati quyida. "
        + "Status o'zgartirish so'rovlari admin tomonidan tasdiqlanadi.");
    sendMyAssetsWithActions(chatId, user);
    telegram.sendMessage(chatId, helpText());
  }

  private void onMyAssets(TelegramModels.Message msg) {
    long chatId = msg.chat().id();
    TelegramModels.From from = msg.from();
    Optional<IdentityUser> userOpt = resolveAndLink(from, chatId);
    if (userOpt.isEmpty()) {
      telegram.sendMessage(chatId, "Akkaunt bog'lanmagan. /start ni bosing.");
      return;
    }
    IdentityUser user = userOpt.get();

    sendMyAssetsWithActions(chatId, user);
  }

  private void sendMyAssetsWithActions(long chatId, IdentityUser user) {
    PageResponse<AssignedAsset> page = assets.listAssignedAssets(user.id(), 0, MY_ASSETS_LIMIT);
    if (page == null || page.items() == null || page.items().isEmpty()) {
      telegram.sendMessage(chatId, "Sizga biriktirilgan aktivlar yo'q.");
      return;
    }

    telegram.sendMessage(chatId, "Sizga biriktirilgan aktivlar: " + page.items().size() + " ta");

    int i = 1;
    for (AssignedAsset a : page.items()) {
      if (a == null || a.asset() == null) continue;
      sendAssetCard(chatId, i++, a.asset());
    }

    if (page.totalItems() > page.items().size()) {
      telegram.sendMessage(chatId, "Eslatma: faqat birinchi " + page.items().size() + " ta aktiv ko'rsatildi.");
    }
  }

  private void sendAssetCard(long chatId, int index, Asset asset) {
    if (asset == null) return;

    String title = index + ") " + safe(asset.name());
    String text = title + "\n"
        + "Serial: " + safe(asset.serialNumber()) + "\n"
        + "Status: " + safe(asset.status());

    String status = asset.status() == null ? "" : asset.status().trim().toUpperCase();
    boolean terminal = "LOST".equals(status) || "WRITTEN_OFF".equals(status);

    InlineKeyboardMarkup kb = null;
    if (!terminal) {
      kb = new InlineKeyboardMarkup(List.of(
          List.of(
              new InlineKeyboardButton("Ishlayapti", "chk:ok:" + asset.id()),
              new InlineKeyboardButton("Tamirtalab", "iss:repair:" + asset.id())
          ),
          List.of(
              new InlineKeyboardButton("Yo'qolgan вќ—", "iss:lost:" + asset.id()),
              new InlineKeyboardButton("Buzilgan вљ пёЏ", "iss:broken:" + asset.id())
          )
      ));
    }

    telegram.sendMessage(chatId, text, kb);
  }

  private void onRequest(TelegramModels.Message msg) {
    long chatId = msg.chat().id();
    TelegramModels.From from = msg.from();
    Optional<IdentityUser> userOpt = resolveAndLink(from, chatId);
    if (userOpt.isEmpty()) {
      telegram.sendMessage(chatId, "Akkaunt bog'lanmagan. /start ni bosing.");
      return;
    }
    IdentityUser user = userOpt.get();
    if (user.roles() == null || user.roles().stream().noneMatch(r -> "EMPLOYEE".equals(r))) {
      telegram.sendMessage(chatId, "So'rov yuborish faqat xodim (EMPLOYEE) uchun.");
      return;
    }

    String text = msg.text() == null ? "" : msg.text().trim();
    String[] parts = text.split("\\s+", 2);
    if (parts.length < 2 || parts[1].isBlank()) {
      telegram.sendMessage(chatId, "Format: /request <CATEGORY_CODE> <TYPE> <QTY>\nMisol: /request IT LAPTOP 1");
      return;
    }

    List<CreateAssetRequestItem> items = parseRequestItems(parts[1]);
    if (items.isEmpty()) {
      telegram.sendMessage(chatId, "Format: /request <CATEGORY_CODE> <TYPE> <QTY>\nMisol: /request IT LAPTOP 1");
      return;
    }

    try {
      var resp = assets.createAssetRequestAs(user.id(), user.username(), user.roles(), new CreateAssetRequest(null, items));
      Object id = resp == null ? null : resp.get("id");
      telegram.sendMessage(chatId, "So'rov yuborildi. ID: " + (id == null ? "-" : String.valueOf(id)));
    } catch (Exception e) {
      log.warn("Bot request create failed userId={}", user.id(), e);
      telegram.sendMessage(chatId, "So'rov yuborishda xatolik. Keyinroq urinib ko'ring.");
    }
  }

  private List<CreateAssetRequestItem> parseRequestItems(String raw) {
    String[] toks = raw.trim().split("\\s+");
    if (toks.length < 3) return List.of();
    String category = toks[0].trim();
    String type = toks[1].trim();
    int qty;
    try {
      qty = Integer.parseInt(toks[2].trim());
    } catch (Exception e) {
      return List.of();
    }
    if (qty <= 0) return List.of();
    return List.of(new CreateAssetRequestItem(type, category, qty));
  }

  private void handleCallback(TelegramModels.CallbackQuery cb) {
    long chatId = cb.message() == null || cb.message().chat() == null ? 0 : cb.message().chat().id();
    if (chatId == 0) return;
    String data = cb.data();
    if (data == null || data.isBlank()) return;

    if (data.startsWith("chk:ok:")) {
      telegram.answerCallbackQuery(cb.id(), "Rahmat");
      return;
    }
    if (data.startsWith("chk:bad:")) {
      UUID assetId = parseUuid(data.substring("chk:bad:".length()));
      telegram.answerCallbackQuery(cb.id(), "Tanlang");
      if (assetId != null) {
        InlineKeyboardMarkup kb = new InlineKeyboardMarkup(List.of(
            List.of(new InlineKeyboardButton("Tamirtalab", "iss:repair:" + assetId)),
            List.of(new InlineKeyboardButton("Yo'qolgan", "iss:lost:" + assetId)),
            List.of(new InlineKeyboardButton("Buzilgan", "iss:broken:" + assetId))
        ));
        telegram.sendMessage(chatId, "Qanday muammo?", kb);
      }
      return;
    }
    if (data.startsWith("iss:")) {
      onIssueReported(cb, data);
      return;
    }
    if (data.startsWith("adm:")) {
      onAdminDecision(cb, data);
    }
  }

  private void onIssueReported(TelegramModels.CallbackQuery cb, String data) {
    long chatId = cb.message().chat().id();
    TelegramModels.From from = cb.from();
    Optional<IdentityUser> reporterOpt = resolveAndLink(from, chatId);
    if (reporterOpt.isEmpty()) {
      telegram.answerCallbackQuery(cb.id(), "Akkaunt bog'lanmagan");
      return;
    }
    IdentityUser reporter = reporterOpt.get();
    String[] parts = data.split(":", 3);
    if (parts.length < 3) return;
    String kind = parts[1];
    UUID assetId = parseUuid(parts[2]);
    if (assetId == null) return;

    // Security: only allow reporting issues for assets currently assigned to this user.
    var asgOpt = assets.currentAssignment(assetId);
    if (asgOpt.isEmpty()
        || asgOpt.get().ownerId() == null
        || !"EMPLOYEE".equalsIgnoreCase(String.valueOf(asgOpt.get().ownerType()))
        || !asgOpt.get().ownerId().equals(reporter.id())) {
      telegram.answerCallbackQuery(cb.id(), "Bu aktiv sizga biriktirilmagan");
      telegram.sendMessage(chatId, "Bu aktiv sizga biriktirilmagan.");
      return;
    }

    String requestedStatus;
    String requestedLabel;
    if ("lost".equals(kind)) {
      requestedStatus = "LOST";
      requestedLabel = "Yo'qolgan";
    } else if ("broken".equals(kind)) {
      requestedStatus = "IN_REPAIR";
      requestedLabel = "Buzilgan";
    } else {
      requestedStatus = "IN_REPAIR";
      requestedLabel = "Tamirtalab";
    }

    Asset asset;
    try {
      asset = assets.getAsset(assetId);
    } catch (Exception e) {
      telegram.answerCallbackQuery(cb.id(), "Aktiv topilmadi");
      return;
    }

    UUID reportId = UUID.randomUUID();
    IssueReport report = new IssueReport(
        reportId,
        assetId,
        reporter.id(),
        chatId,
        reporter.fullName(),
        requestedStatus,
        requestedLabel,
        Instant.now()
    );
    state.saveIssue(report);

    telegram.answerCallbackQuery(cb.id(), "Yuborildi");
    telegram.sendMessage(chatId, "Xabaringiz adminga yuborildi. Tasdiqlangach status yangilanadi.");

    notifyAdmins(report, asset);
  }

  private void notifyAdmins(IssueReport report, Asset asset) {
    List<IdentityUser> all = identity.listUsers();
    if (all == null || all.isEmpty()) return;
    String text = "Xodim muammo yubordi:\n"
        + "- Xodim: " + safe(report.reporterFullName()) + "\n"
        + "- Aktiv: " + safe(asset.name()) + " (" + safe(asset.serialNumber()) + ")\n"
        + "- Holat: " + safe(report.requestedLabel()) + "\n\n"
        + "Tasdiqlaysizmi?";

    InlineKeyboardMarkup kb = new InlineKeyboardMarkup(List.of(
        List.of(
            new InlineKeyboardButton("Tasdiqlash", "adm:approve:" + report.id()),
            new InlineKeyboardButton("Rad etish", "adm:reject:" + report.id())
        )
    ));

    for (IdentityUser u : all) {
      if (u == null || u.telegramChatId() == null) continue;
      if (!isManager(u)) continue;
      telegram.sendMessage(u.telegramChatId(), text, kb);
    }
  }

  private void onAdminDecision(TelegramModels.CallbackQuery cb, String data) {
    long chatId = cb.message().chat().id();
    TelegramModels.From from = cb.from();
    Optional<IdentityUser> adminOpt = resolveAndLink(from, chatId);
    if (adminOpt.isEmpty() || !isManager(adminOpt.get())) {
      telegram.answerCallbackQuery(cb.id(), "Ruxsat yo'q");
      return;
    }
    IdentityUser admin = adminOpt.get();

    String[] parts = data.split(":", 3);
    if (parts.length < 3) return;
    String action = parts[1];
    UUID reportId = parseUuid(parts[2]);
    if (reportId == null) return;

    Optional<IssueReport> reportOpt = state.getIssue(reportId);
    if (reportOpt.isEmpty()) {
      telegram.answerCallbackQuery(cb.id(), "Topilmadi");
      return;
    }
    IssueReport report = reportOpt.get();

    Asset asset;
    try {
      asset = assets.getAsset(report.assetId());
    } catch (Exception e) {
      telegram.answerCallbackQuery(cb.id(), "Aktiv topilmadi");
      state.deleteIssue(reportId);
      return;
    }

    if ("reject".equals(action)) {
      telegram.answerCallbackQuery(cb.id(), "Rad etildi");
      if (report.reporterChatId() != null) {
        telegram.sendMessage(report.reporterChatId(), "Admin xabaringizni rad etdi: " + safe(asset.name()));
      }
      state.deleteIssue(reportId);
      return;
    }

    try {
      String token = auth.asUserToken(admin.id(), admin.username(), admin.roles());
      String reason = "Telegram: " + safe(report.reporterFullName()) + " qurilma ishlamayapti (" + safe(report.requestedLabel()) + ")";
      assets.changeStatusAs(report.assetId(), report.requestedStatus(), reason, token);
      telegram.answerCallbackQuery(cb.id(), "Tasdiqlandi");
      telegram.sendMessage(chatId, "Tasdiqlandi: " + safe(asset.name()) + " -> " + report.requestedStatus());
      if (report.reporterChatId() != null) {
        telegram.sendMessage(report.reporterChatId(), "Admin tasdiqladi: " + safe(asset.name()) + " holati yangilandi.");
      }
    } catch (Exception e) {
      telegram.answerCallbackQuery(cb.id(), "Xatolik");
      telegram.sendMessage(chatId, "Status yangilashda xatolik: " + e.getMessage());
    } finally {
      state.deleteIssue(reportId);
    }
  }

  private Optional<IdentityUser> resolveAndLink(TelegramModels.From from, long chatId) {
    if (from == null) return Optional.empty();

    Optional<IdentityUser> found = identity.lookupByTelegramUserId(from.id());
    if (found.isEmpty() && from.username() != null && !from.username().isBlank()) {
      found = identity.lookupByTelegramUsername(from.username());
    }
    if (found.isEmpty()) return Optional.empty();

    IdentityUser user = found.get();
    if (user.telegramChatId() == null || user.telegramChatId() != chatId || user.telegramUserId() == null || user.telegramUserId() != from.id()) {
      try {
        user = identity.updateContacts(user.id(), new IdentityClient.UpdateContactsRequest(
            null,
            from.username() == null ? null : from.username(),
            from.id(),
            chatId
        ));
      } catch (Exception e) {
        log.warn("Failed to link telegram chatId for userId={}", user.id(), e);
      }
    }
    return Optional.of(user);
  }

  private static boolean isManager(IdentityUser u) {
    if (u.roles() == null) return false;
    return u.roles().stream().anyMatch(r -> "ADMIN".equals(r) || "IT_ADMIN".equals(r) || "ASSET_MANAGER".equals(r));
  }

  private static UUID parseUuid(String raw) {
    try {
      return UUID.fromString(raw.trim());
    } catch (Exception ignored) {
      return null;
    }
  }

  private static String safe(String s) {
    return s == null ? "-" : s;
  }

  private static String helpText() {
    return "Buyruqlar:\n"
        + "/start - akkauntni bog'lash + aktivlar\n"
        + "/myassets - biriktirilgan aktivlar\n"
        + "/request IT LAPTOP 1 - aktiv so'rovi\n"
        + "/help - yordam";
  }
}


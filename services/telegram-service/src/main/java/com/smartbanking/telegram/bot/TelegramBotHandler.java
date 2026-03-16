package com.smartbanking.telegram.bot;

import com.smartbanking.telegram.bot.BotStateRepository.IssueReport;
import com.smartbanking.telegram.bot.BotStateRepository.AssetRequestWizard;
import com.smartbanking.telegram.bot.BotStateRepository.RequestWizardStep;
import com.smartbanking.telegram.bot.BotStateRepository.SignupRequest;
import com.smartbanking.telegram.bot.BotStateRepository.SignupWizard;
import com.smartbanking.telegram.bot.BotStateRepository.SignupWizardStep;
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
import java.util.Set;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;

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

    // Non-command messages may be part of a conversational flow (wizards).
    if (!trimmed.startsWith("/")) {
      Optional<SignupWizard> signup = state.getSignupWizard(chatId);
      if (signup.isPresent()) {
        onSignupWizardInput(msg, signup.get(), trimmed);
        return;
      }
      Optional<AssetRequestWizard> requestWizard = state.getRequestWizard(chatId);
      if (requestWizard.isPresent() && requestWizard.get().step() == RequestWizardStep.TYPE_TEXT) {
        onRequestWizardInput(msg, requestWizard.get(), trimmed);
        return;
      }
      telegram.sendMessage(chatId, helpText());
      return;
    }

    String cmd = trimmed.split("\\s+", 2)[0];
    if (cmd.contains("@")) {
      cmd = cmd.substring(0, cmd.indexOf('@'));
    }

    switch (cmd) {
      case "/start" -> onStart(msg);
      case "/help" -> telegram.sendMessage(chatId, helpText());
      case "/myassets" -> onMyAssets(msg);
      case "/request" -> onRequest(msg);
      case "/cancel" -> onCancel(msg);
      default -> telegram.sendMessage(chatId, helpText());
    }
  }

  private void onStart(TelegramModels.Message msg) {
    long chatId = msg.chat().id();
    TelegramModels.From from = msg.from();
    Optional<IdentityUser> userOpt = resolveAndLink(from, chatId);
    if (userOpt.isEmpty()) {
      onUnknownAccountStart(msg);
      return;
    }
    IdentityUser user = userOpt.get();
    telegram.sendMessage(chatId, "Assalomu alaykum, " + safe(user.fullName()) + ".\n\nSizga biriktirilgan aktivlar ro'yxati quyida. "
        + "Status o'zgartirish so'rovlari admin tomonidan tasdiqlanadi.");
    sendMyAssetsWithActions(chatId, user);
    telegram.sendMessage(chatId, helpText());
  }

  private void onCancel(TelegramModels.Message msg) {
    long chatId = msg.chat().id();
    state.deleteSignupWizard(chatId);
    state.deleteRequestWizard(chatId);
    telegram.sendMessage(chatId, "Bekor qilindi.");
  }

  private void onUnknownAccountStart(TelegramModels.Message msg) {
    long chatId = msg.chat().id();

    Optional<UUID> pending = state.getPendingSignupRequestId(chatId);
    if (pending.isPresent()) {
      telegram.sendMessage(chatId, "So'rovingiz adminga yuborilgan. Tasdiqlanishi kutilmoqda.");
      return;
    }

    Optional<SignupWizard> existing = state.getSignupWizard(chatId);
    if (existing.isPresent()) {
      promptSignupStep(chatId, existing.get());
      return;
    }

    startSignupWizard(msg);
  }

  private void startSignupWizard(TelegramModels.Message msg) {
    long chatId = msg.chat().id();
    TelegramModels.From from = msg.from();
    if (from == null) {
      telegram.sendMessage(chatId, "Xatolik: Telegram akkaunt aniqlanmadi.");
      return;
    }

    SignupWizard wizard = new SignupWizard(
        chatId,
        from.id(),
        from.username(),
        SignupWizardStep.FULL_NAME,
        null,
        null,
        null,
        Instant.now()
    );
    state.saveSignupWizard(wizard);

    telegram.sendMessage(chatId, "Siz tizimda topilmadingiz.\n"
        + "Administratorga yuborish uchun quyidagi ma'lumotlarni kiriting.\n\n"
        + "1/3 Ism familiya:");
  }

  private void promptSignupStep(long chatId, SignupWizard wizard) {
    if (wizard == null || wizard.step() == null) {
      telegram.sendMessage(chatId, "1/3 Ism familiya:");
      return;
    }

    switch (wizard.step()) {
      case FULL_NAME -> telegram.sendMessage(chatId, "1/3 Ism familiya:");
      case JOB_TITLE -> telegram.sendMessage(chatId, "2/3 Lavozim:");
      case PHONE -> telegram.sendMessage(chatId, "3/3 Telefon raqami (masalan: +998901234567):");
      case CONFIRM -> sendSignupConfirm(chatId, wizard);
    }
  }

  private void onSignupWizardInput(TelegramModels.Message msg, SignupWizard wizard, String input) {
    long chatId = msg.chat().id();
    if (wizard == null) return;

    SignupWizardStep step = wizard.step() == null ? SignupWizardStep.FULL_NAME : wizard.step();

    if (step == SignupWizardStep.CONFIRM) {
      telegram.sendMessage(chatId, "Iltimos, tugmalar orqali tanlang.");
      sendSignupConfirm(chatId, wizard);
      return;
    }

    if (input == null || input.isBlank()) {
      promptSignupStep(chatId, wizard);
      return;
    }

    if (step == SignupWizardStep.FULL_NAME) {
      SignupWizard next = new SignupWizard(
          wizard.chatId(),
          wizard.telegramUserId(),
          wizard.telegramUsername(),
          SignupWizardStep.JOB_TITLE,
          normalize(input, 200),
          null,
          null,
          wizard.createdAt()
      );
      state.saveSignupWizard(next);
      telegram.sendMessage(chatId, "2/3 Lavozim:");
      return;
    }

    if (step == SignupWizardStep.JOB_TITLE) {
      SignupWizard next = new SignupWizard(
          wizard.chatId(),
          wizard.telegramUserId(),
          wizard.telegramUsername(),
          SignupWizardStep.PHONE,
          wizard.fullName(),
          normalize(input, 120),
          null,
          wizard.createdAt()
      );
      state.saveSignupWizard(next);
      telegram.sendMessage(chatId, "3/3 Telefon raqami (masalan: +998901234567):");
      return;
    }

    SignupWizard next = new SignupWizard(
        wizard.chatId(),
        wizard.telegramUserId(),
        wizard.telegramUsername(),
        SignupWizardStep.CONFIRM,
        wizard.fullName(),
        wizard.jobTitle(),
        normalize(input, 32),
        wizard.createdAt()
    );
    state.saveSignupWizard(next);
    sendSignupConfirm(chatId, next);
  }

  private void sendSignupConfirm(long chatId, SignupWizard wizard) {
    String tg = wizard.telegramUsername() == null || wizard.telegramUsername().isBlank()
        ? "(username yo'q)"
        : "@" + wizard.telegramUsername().trim().replaceFirst("^@", "");
    String text = "Ma'lumotlar:\n"
        + "- Ism: " + safe(wizard.fullName()) + "\n"
        + "- Lavozim: " + safe(wizard.jobTitle()) + "\n"
        + "- Telefon: " + safe(wizard.phoneNumber()) + "\n"
        + "- Telegram: " + tg + " (id: " + wizard.telegramUserId() + ")\n\n"
        + "Adminga yuborasizmi?";

    InlineKeyboardMarkup kb = new InlineKeyboardMarkup(List.of(
        List.of(
            new InlineKeyboardButton("Yuborish", "signup:submit"),
            new InlineKeyboardButton("Bekor qilish", "signup:cancel")
        )
    ));

    telegram.sendMessage(chatId, text, kb);
  }

  private void onSignupWizardCallback(TelegramModels.CallbackQuery cb, String data) {
    long chatId = cb.message() == null || cb.message().chat() == null ? 0 : cb.message().chat().id();
    if (chatId == 0) return;

    if ("signup:cancel".equals(data)) {
      state.deleteSignupWizard(chatId);
      telegram.answerCallbackQuery(cb.id(), "Bekor qilindi");
      telegram.sendMessage(chatId, "Bekor qilindi.");
      return;
    }

    if (!"signup:submit".equals(data)) {
      telegram.answerCallbackQuery(cb.id(), "Noma'lum buyruq");
      return;
    }

    Optional<SignupWizard> wizardOpt = state.getSignupWizard(chatId);
    if (wizardOpt.isEmpty()) {
      telegram.answerCallbackQuery(cb.id(), "Topilmadi");
      return;
    }
    SignupWizard wizard = wizardOpt.get();
    if (wizard.step() != SignupWizardStep.CONFIRM) {
      telegram.answerCallbackQuery(cb.id(), "Davom eting");
      promptSignupStep(chatId, wizard);
      return;
    }

    String fullName = normalize(wizard.fullName(), 200);
    String jobTitle = normalize(wizard.jobTitle(), 120);
    String phone = normalize(wizard.phoneNumber(), 32);
    if (fullName == null || jobTitle == null || phone == null) {
      telegram.answerCallbackQuery(cb.id(), "Ma'lumotlar yetarli emas");
      promptSignupStep(chatId, wizard);
      return;
    }

    UUID requestId;
    try {
      var created = identity.createEmployeeSignupRequest(new IdentityClient.CreateSignupRequest(
          fullName,
          jobTitle,
          phone,
          normalizeTelegramUsername(wizard.telegramUsername()),
          wizard.telegramUserId(),
          chatId
      ));
      requestId = created == null ? null : created.id();
      if (requestId == null) {
        telegram.answerCallbackQuery(cb.id(), "Xatolik");
        telegram.sendMessage(chatId, "So'rov yuborishda xatolik. Keyinroq urinib ko'ring.");
        return;
      }
    } catch (HttpClientErrorException.Conflict e) {
      telegram.answerCallbackQuery(cb.id(), "Yuborilgan");
      telegram.sendMessage(chatId, "So'rov avval yuborilgan. Tasdiqlanishi kutilmoqda.");
      state.deleteSignupWizard(chatId);
      return;
    } catch (Exception e) {
      log.warn("Employee signup request create failed chatId={}", chatId, e);
      telegram.answerCallbackQuery(cb.id(), "Xatolik");
      telegram.sendMessage(chatId, "So'rov yuborishda xatolik. Keyinroq urinib ko'ring.");
      return;
    }

    SignupRequest req = new SignupRequest(
        requestId,
        chatId,
        wizard.telegramUserId(),
        normalizeTelegramUsername(wizard.telegramUsername()),
        fullName,
        jobTitle,
        phone,
        Instant.now()
    );
    state.saveSignupRequest(req);
    state.deleteSignupWizard(chatId);

    telegram.answerCallbackQuery(cb.id(), "Yuborildi");
    telegram.sendMessage(chatId, "So'rov adminga yuborildi. Admin panelda ko'rib chiqiladi.");
  }

  private void notifyAdminsSignup(SignupRequest req) {
    List<IdentityUser> all = identity.listUsers();
    if (all == null || all.isEmpty()) return;

    String tg = req.telegramUsername() == null || req.telegramUsername().isBlank()
        ? "(username yo'q)"
        : "@" + req.telegramUsername().trim().replaceFirst("^@", "");

    String text = "Yangi xodim qo'shish so'rovi:\n"
        + "- Ism: " + safe(req.fullName()) + "\n"
        + "- Lavozim: " + safe(req.jobTitle()) + "\n"
        + "- Telefon: " + safe(req.phoneNumber()) + "\n"
        + "- Telegram: " + tg + " (id: " + req.telegramUserId() + ")\n\n"
        + "Tasdiqlaysizmi?";

    InlineKeyboardMarkup kb = new InlineKeyboardMarkup(List.of(
        List.of(
            new InlineKeyboardButton("Tasdiqlash", "usr:approve:" + req.id()),
            new InlineKeyboardButton("Rad etish", "usr:reject:" + req.id())
        )
    ));

    for (IdentityUser u : all) {
      if (u == null || u.telegramChatId() == null) continue;
      if (!isManager(u)) continue;
      telegram.sendMessage(u.telegramChatId(), text, kb);
    }
  }

  private void onSignupAdminDecision(TelegramModels.CallbackQuery cb, String data) {
    long chatId = cb.message() == null || cb.message().chat() == null ? 0 : cb.message().chat().id();
    if (chatId == 0) return;

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
    UUID requestId = parseUuid(parts[2]);
    if (requestId == null) return;

    Optional<SignupRequest> reqOpt = state.getSignupRequest(requestId);
    if (reqOpt.isEmpty()) {
      telegram.answerCallbackQuery(cb.id(), "Topilmadi");
      return;
    }
    SignupRequest req = reqOpt.get();

    if ("reject".equals(action)) {
      telegram.answerCallbackQuery(cb.id(), "Rad etildi");
      telegram.sendMessage(chatId, "Rad etildi: " + safe(req.fullName()));
      telegram.sendMessage(req.chatId(), "Admin so'rovingizni rad etdi. /start ni qayta bosing.");
      state.deleteSignupRequest(requestId);
      state.clearPendingSignupRequestId(req.chatId());
      return;
    }

    if (!hasRole(admin, "ADMIN")) {
      telegram.answerCallbackQuery(cb.id(), "ADMIN roli kerak");
      telegram.sendMessage(chatId, "Xodim yaratish uchun ADMIN roli kerak.");
      return;
    }

    String adminToken = auth.asUserToken(admin.id(), admin.username(), admin.roles());
    String baseUsername = req.telegramUsername();
    if (baseUsername == null || baseUsername.isBlank()) {
      baseUsername = "tg_" + req.telegramUserId();
    }
    baseUsername = baseUsername.trim().replaceFirst("^@", "");
    if (baseUsername.length() > 120) {
      baseUsername = baseUsername.substring(0, 120);
    }

    String password = "Tg" + UUID.randomUUID().toString().replace("-", "") + "!";

    IdentityClient.AdminCreateUserRequest createReq = new IdentityClient.AdminCreateUserRequest(
        baseUsername,
        password,
        req.fullName(),
        req.phoneNumber(),
        req.telegramUsername(),
        req.telegramUserId(),
        req.chatId(),
        req.jobTitle(),
        null,
        null,
        Set.of("EMPLOYEE")
    );

    IdentityClient.CreatedUserResponse created;
    try {
      created = identity.adminCreateUser(adminToken, createReq);
    } catch (Exception e) {
      // Retry with a guaranteed-unique suffix on conflicts or duplicates.
      String fallbackUsername = baseUsername + "_" + req.id().toString().substring(0, 6);
      IdentityClient.AdminCreateUserRequest fallbackReq = new IdentityClient.AdminCreateUserRequest(
          fallbackUsername,
          password,
          req.fullName(),
          req.phoneNumber(),
          req.telegramUsername(),
          req.telegramUserId(),
          req.chatId(),
          req.jobTitle(),
          null,
          null,
          Set.of("EMPLOYEE")
      );
      try {
        created = identity.adminCreateUser(adminToken, fallbackReq);
      } catch (Exception e2) {
        telegram.answerCallbackQuery(cb.id(), "Xatolik");
        telegram.sendMessage(chatId, "Xodim yaratishda xatolik: " + e2.getMessage());
        return;
      }
    }

    telegram.answerCallbackQuery(cb.id(), "Tasdiqlandi");
    telegram.sendMessage(chatId, "Xodim qo'shildi: " + safe(req.fullName()) + " (" + safe(created.username()) + ")");
    telegram.sendMessage(req.chatId(), "Siz tizimga qo'shildingiz. /start ni qayta bosing.");

    state.deleteSignupRequest(requestId);
    state.clearPendingSignupRequestId(req.chatId());
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
              new InlineKeyboardButton("Buzilgan", "iss:broken:" + asset.id())
          ),
          List.of(
              new InlineKeyboardButton("Tamirtalab", "iss:repair:" + asset.id()),
              new InlineKeyboardButton("Yo'qolgan", "iss:lost:" + asset.id())
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

    state.saveRequestWizard(new AssetRequestWizard(
        chatId,
        user.id(),
        user.username(),
        user.roles(),
        RequestWizardStep.CATEGORY,
        null,
        null,
        null,
        Instant.now()
    ));

    sendRequestCategoryPicker(chatId);
  }

  private void sendRequestCategoryPicker(long chatId) {
    List<AssetClient.AssetCategory> categories;
    try {
      categories = assets.listCategories();
    } catch (Exception e) {
      categories = List.of();
    }

    if (categories == null || categories.isEmpty()) {
      categories = List.of(
          new AssetClient.AssetCategory("IT", "IT"),
          new AssetClient.AssetCategory("OFFICE", "Office"),
          new AssetClient.AssetCategory("SECURITY", "Security")
      );
    }

    List<List<InlineKeyboardButton>> rows = new ArrayList<>();
    List<InlineKeyboardButton> row = new ArrayList<>();
    for (AssetClient.AssetCategory c : categories) {
      if (c == null || c.code() == null || c.code().isBlank()) continue;
      String code = c.code().trim();
      String label = c.name() == null || c.name().isBlank() ? code : c.name().trim();
      row.add(new InlineKeyboardButton(label, "req:cat:" + code));
      if (row.size() == 2) {
        rows.add(row);
        row = new ArrayList<>();
      }
    }
    if (!row.isEmpty()) rows.add(row);

    rows.add(List.of(new InlineKeyboardButton("Bekor qilish", "req:cancel")));

    telegram.sendMessage(chatId, "Kategoriya tanlang:", new InlineKeyboardMarkup(rows));
  }

  private void onRequestWizardInput(TelegramModels.Message msg, AssetRequestWizard wizard, String input) {
    long chatId = msg.chat().id();
    if (wizard == null || wizard.step() != RequestWizardStep.TYPE_TEXT) return;

    String type = normalize(input, 120);
    if (type == null) {
      telegram.sendMessage(chatId, "Aktiv turini yozing (masalan: LAPTOP):");
      return;
    }

    AssetRequestWizard next = new AssetRequestWizard(
        wizard.chatId(),
        wizard.requesterUserId(),
        wizard.requesterUsername(),
        wizard.requesterRoles(),
        RequestWizardStep.QTY,
        wizard.categoryCode(),
        type,
        null,
        wizard.createdAt()
    );
    state.saveRequestWizard(next);
    sendRequestQtyPicker(chatId);
  }

  private void onRequestWizardCallback(TelegramModels.CallbackQuery cb, String data) {
    long chatId = cb.message() == null || cb.message().chat() == null ? 0 : cb.message().chat().id();
    if (chatId == 0) return;

    String[] parts = data.split(":", 3);
    if (parts.length < 2) return;
    String action = parts[1];
    String payload = parts.length > 2 ? parts[2] : null;

    if ("cancel".equals(action)) {
      state.deleteRequestWizard(chatId);
      telegram.answerCallbackQuery(cb.id(), "Bekor qilindi");
      telegram.sendMessage(chatId, "Bekor qilindi.");
      return;
    }

    Optional<AssetRequestWizard> wizardOpt = state.getRequestWizard(chatId);
    if (wizardOpt.isEmpty()) {
      telegram.answerCallbackQuery(cb.id(), "Topilmadi");
      return;
    }
    AssetRequestWizard wizard = wizardOpt.get();

    Optional<IdentityUser> userOpt = resolveAndLink(cb.from(), chatId);
    if (userOpt.isEmpty() || wizard.requesterUserId() == null || !wizard.requesterUserId().equals(userOpt.get().id())) {
      telegram.answerCallbackQuery(cb.id(), "Ruxsat yo'q");
      return;
    }
    IdentityUser user = userOpt.get();

    if ("cat".equals(action)) {
      if (payload == null || payload.isBlank()) {
        telegram.answerCallbackQuery(cb.id(), "Tanlang");
        return;
      }
      AssetRequestWizard next = new AssetRequestWizard(
          wizard.chatId(),
          wizard.requesterUserId(),
          wizard.requesterUsername(),
          wizard.requesterRoles(),
          RequestWizardStep.TYPE,
          payload.trim(),
          null,
          null,
          wizard.createdAt()
      );
      state.saveRequestWizard(next);
      telegram.answerCallbackQuery(cb.id(), "Tanlandi");
      sendRequestTypePicker(chatId, next.categoryCode());
      return;
    }

    if ("type".equals(action)) {
      if (payload == null || payload.isBlank()) {
        telegram.answerCallbackQuery(cb.id(), "Tanlang");
        return;
      }
      if ("other".equalsIgnoreCase(payload)) {
        AssetRequestWizard next = new AssetRequestWizard(
            wizard.chatId(),
            wizard.requesterUserId(),
            wizard.requesterUsername(),
            wizard.requesterRoles(),
            RequestWizardStep.TYPE_TEXT,
            wizard.categoryCode(),
            null,
            null,
            wizard.createdAt()
        );
        state.saveRequestWizard(next);
        telegram.answerCallbackQuery(cb.id(), "Yozing");
        telegram.sendMessage(chatId, "Aktiv turini yozing (masalan: LAPTOP):");
        return;
      }

      AssetRequestWizard next = new AssetRequestWizard(
          wizard.chatId(),
          wizard.requesterUserId(),
          wizard.requesterUsername(),
          wizard.requesterRoles(),
          RequestWizardStep.QTY,
          wizard.categoryCode(),
          payload.trim(),
          null,
          wizard.createdAt()
      );
      state.saveRequestWizard(next);
      telegram.answerCallbackQuery(cb.id(), "Tanlandi");
      sendRequestQtyPicker(chatId);
      return;
    }

    if ("qty".equals(action)) {
      if (payload == null || payload.isBlank()) {
        telegram.answerCallbackQuery(cb.id(), "Tanlang");
        return;
      }
      int qty;
      try {
        qty = Integer.parseInt(payload.trim());
      } catch (Exception e) {
        telegram.answerCallbackQuery(cb.id(), "Noto'g'ri");
        return;
      }
      if (qty <= 0) {
        telegram.answerCallbackQuery(cb.id(), "Noto'g'ri");
        return;
      }
      AssetRequestWizard next = new AssetRequestWizard(
          wizard.chatId(),
          wizard.requesterUserId(),
          wizard.requesterUsername(),
          wizard.requesterRoles(),
          RequestWizardStep.CONFIRM,
          wizard.categoryCode(),
          wizard.type(),
          qty,
          wizard.createdAt()
      );
      state.saveRequestWizard(next);
      telegram.answerCallbackQuery(cb.id(), "OK");
      sendRequestConfirm(chatId, next);
      return;
    }

    if ("submit".equals(action)) {
      if (wizard.step() != RequestWizardStep.CONFIRM
          || wizard.categoryCode() == null
          || wizard.type() == null
          || wizard.quantity() == null) {
        telegram.answerCallbackQuery(cb.id(), "Tugatilmadi");
        sendRequestCategoryPicker(chatId);
        return;
      }

      try {
        List<CreateAssetRequestItem> items = List.of(new CreateAssetRequestItem(wizard.type(), wizard.categoryCode(), wizard.quantity()));
        var resp = assets.createAssetRequestAs(user.id(), user.username(), user.roles(), new CreateAssetRequest("Telegram bot request", items));
        Object id = resp == null ? null : resp.get("id");
        state.deleteRequestWizard(chatId);
        telegram.answerCallbackQuery(cb.id(), "Yuborildi");
        telegram.sendMessage(chatId, "So'rov yuborildi. ID: " + (id == null ? "-" : String.valueOf(id)));
      } catch (Exception e) {
        log.warn("Bot request create failed userId={}", user.id(), e);
        telegram.answerCallbackQuery(cb.id(), "Xatolik");
        telegram.sendMessage(chatId, "So'rov yuborishda xatolik. Keyinroq urinib ko'ring.");
      }
      return;
    }

    telegram.answerCallbackQuery(cb.id(), "Noma'lum");
  }

  private void sendRequestTypePicker(long chatId, String categoryCode) {
    String code = categoryCode == null ? "-" : categoryCode.trim();
    List<String> types = defaultTypesForCategory(code);

    List<List<InlineKeyboardButton>> rows = new ArrayList<>();
    List<InlineKeyboardButton> row = new ArrayList<>();
    for (String t : types) {
      if (t == null || t.isBlank()) continue;
      row.add(new InlineKeyboardButton(t, "req:type:" + t));
      if (row.size() == 2) {
        rows.add(row);
        row = new ArrayList<>();
      }
    }
    if (!row.isEmpty()) rows.add(row);

    rows.add(List.of(new InlineKeyboardButton("Boshqa", "req:type:other")));
    rows.add(List.of(new InlineKeyboardButton("Bekor qilish", "req:cancel")));

    telegram.sendMessage(chatId, "Turi tanlang (" + code + "):", new InlineKeyboardMarkup(rows));
  }

  private void sendRequestQtyPicker(long chatId) {
    InlineKeyboardMarkup kb = new InlineKeyboardMarkup(List.of(
        List.of(
            new InlineKeyboardButton("1", "req:qty:1"),
            new InlineKeyboardButton("2", "req:qty:2"),
            new InlineKeyboardButton("3", "req:qty:3")
        ),
        List.of(
            new InlineKeyboardButton("5", "req:qty:5"),
            new InlineKeyboardButton("10", "req:qty:10")
        ),
        List.of(new InlineKeyboardButton("Bekor qilish", "req:cancel"))
    ));
    telegram.sendMessage(chatId, "Miqdor:", kb);
  }

  private void sendRequestConfirm(long chatId, AssetRequestWizard wizard) {
    String text = "So'rov:\n"
        + "- Kategoriya: " + safe(wizard.categoryCode()) + "\n"
        + "- Turi: " + safe(wizard.type()) + "\n"
        + "- Miqdor: " + (wizard.quantity() == null ? "-" : wizard.quantity()) + "\n\n"
        + "Yuborasizmi?";

    InlineKeyboardMarkup kb = new InlineKeyboardMarkup(List.of(
        List.of(
            new InlineKeyboardButton("Yuborish", "req:submit"),
            new InlineKeyboardButton("Bekor qilish", "req:cancel")
        )
    ));

    telegram.sendMessage(chatId, text, kb);
  }

  private static List<String> defaultTypesForCategory(String categoryCode) {
    if (categoryCode == null) return List.of("LAPTOP", "MONITOR", "PRINTER", "TERMINAL");
    String code = categoryCode.trim().toUpperCase();
    return switch (code) {
      case "IT" -> List.of("LAPTOP", "MONITOR", "PRINTER", "TERMINAL", "MOUSE", "KEYBOARD", "SCANNER", "UPS");
      case "OFFICE" -> List.of("CHAIR", "DESK", "PHONE", "PROJECTOR", "PRINTER");
      case "SECURITY" -> List.of("CCTV", "DVR", "ACCESS_CONTROL", "SAFE");
      case "NETWORK" -> List.of("ROUTER", "SWITCH", "ACCESS_POINT");
      case "SERVER" -> List.of("SERVER", "RACK", "UPS");
      case "FURNITURE" -> List.of("CHAIR", "DESK", "CABINET");
      default -> List.of("LAPTOP", "MONITOR", "PRINTER", "TERMINAL");
    };
  }

  private void handleCallback(TelegramModels.CallbackQuery cb) {
    long chatId = cb.message() == null || cb.message().chat() == null ? 0 : cb.message().chat().id();
    if (chatId == 0) return;
    String data = cb.data();
    if (data == null || data.isBlank()) return;

    if (data.startsWith("signup:")) {
      onSignupWizardCallback(cb, data);
      return;
    }
    if (data.startsWith("usr:")) {
      onSignupAdminDecision(cb, data);
      return;
    }
    if (data.startsWith("req:")) {
      onRequestWizardCallback(cb, data);
      return;
    }
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
      if (report.reporterUserId() != null && report.reporterUserId().equals(u.id())) continue;
      if (report.reporterChatId() != null && report.reporterChatId().equals(u.telegramChatId())) continue;
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

  private static boolean hasRole(IdentityUser u, String role) {
    if (u == null || role == null || role.isBlank() || u.roles() == null) return false;
    return u.roles().stream().anyMatch(r -> role.equals(r));
  }

  private static String normalize(String raw, int maxLen) {
    if (raw == null) return null;
    String v = raw.trim();
    if (v.isEmpty()) return null;
    return v.length() <= maxLen ? v : v.substring(0, maxLen);
  }

  private static String normalizeTelegramUsername(String raw) {
    String v = normalize(raw, 120);
    if (v == null) return null;
    if (v.startsWith("@")) v = v.substring(1);
    v = v.trim();
    return v.isEmpty() ? null : v;
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
        + "/request - aktiv so'rovi (tugmalar orqali)\n"
        + "/cancel - bekor qilish\n"
        + "/help - yordam";
  }
}


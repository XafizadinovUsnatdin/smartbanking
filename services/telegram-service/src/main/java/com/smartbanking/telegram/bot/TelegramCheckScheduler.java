package com.smartbanking.telegram.bot;

import com.smartbanking.telegram.clients.AssetClient;
import com.smartbanking.telegram.clients.IdentityClient;
import com.smartbanking.telegram.clients.dto.AssignedAsset;
import com.smartbanking.telegram.clients.dto.IdentityUser;
import com.smartbanking.telegram.clients.dto.PageResponse;
import com.smartbanking.telegram.telegram.TelegramClient;
import com.smartbanking.telegram.telegram.TelegramModels.InlineKeyboardButton;
import com.smartbanking.telegram.telegram.TelegramModels.InlineKeyboardMarkup;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class TelegramCheckScheduler {
  private final TelegramClient telegram;
  private final IdentityClient identity;
  private final AssetClient assets;
  private final BotStateRepository state;
  private final boolean enabled;
  private final int periodDays;

  public TelegramCheckScheduler(
      TelegramClient telegram,
      IdentityClient identity,
      AssetClient assets,
      BotStateRepository state,
      @Value("${telegram.checks.enabled:true}") boolean enabled,
      @Value("${telegram.checks.period-days:30}") int periodDays
  ) {
    this.telegram = telegram;
    this.identity = identity;
    this.assets = assets;
    this.state = state;
    this.enabled = enabled;
    this.periodDays = periodDays;
  }

  @Scheduled(cron = "${telegram.checks.cron:0 0 9 * * *}")
  public void runDaily() {
    if (!enabled) return;
    if (!telegram.isEnabled()) return;

    List<IdentityUser> users = identity.listUsers();
    if (users == null || users.isEmpty()) return;

    Instant now = Instant.now();

    for (IdentityUser u : users) {
      if (u == null || u.telegramChatId() == null) continue;
      if (u.roles() == null || u.roles().stream().noneMatch(r -> "EMPLOYEE".equals(r))) continue;

      Instant last = state.getLastCheckSent(u.id()).orElse(null);
      if (last != null && last.isAfter(now.minus(periodDays, ChronoUnit.DAYS))) {
        continue;
      }

      PageResponse<AssignedAsset> page = assets.listAssignedAssets(u.id(), 0, 50);
      if (page == null || page.items() == null || page.items().isEmpty()) continue;

      sendCheck(u, page.items());
      state.setLastCheckSent(u.id(), now);
    }
  }

  private void sendCheck(IdentityUser u, List<AssignedAsset> assigned) {
    List<AssignedAsset> items = assigned.stream().filter(x -> x != null && x.asset() != null).toList();
    if (items.isEmpty()) return;

    StringBuilder sb = new StringBuilder();
    sb.append(u.fullName() == null ? "Xodim" : u.fullName())
        .append(", sizga biriktirilgan qurilmalar ishlayaptimi?\n\n");
    for (int i = 0; i < items.size(); i++) {
      var a = items.get(i).asset();
      sb.append(i + 1).append(". ").append(a.name() == null ? "-" : a.name());
      if (a.serialNumber() != null && !a.serialNumber().isBlank()) {
        sb.append(" (").append(a.serialNumber()).append(")");
      }
      sb.append("\n");
    }

    List<List<InlineKeyboardButton>> rows = new ArrayList<>();
    for (int i = 0; i < items.size(); i++) {
      var a = items.get(i).asset();
      String assetId = a.id().toString();
      rows.add(List.of(
          new InlineKeyboardButton("Xa", "chk:ok:" + assetId),
          new InlineKeyboardButton("Yo'q", "chk:bad:" + assetId)
      ));
    }

    telegram.sendMessage(u.telegramChatId(), sb.toString().trim(), new InlineKeyboardMarkup(rows));
  }
}


package com.smartbanking.telegram.bot;

import com.smartbanking.telegram.clients.AssetClient;
import com.smartbanking.telegram.clients.IdentityClient;
import com.smartbanking.telegram.clients.dto.AssignedAsset;
import com.smartbanking.telegram.clients.dto.IdentityUser;
import com.smartbanking.telegram.clients.dto.PageResponse;
import com.smartbanking.telegram.telegram.TelegramClient;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class TelegramAgingScheduler {
  private final TelegramClient telegram;
  private final IdentityClient identity;
  private final AssetClient assets;
  private final BotStateRepository state;
  private final boolean enabled;
  private final int agingDays;
  private final int periodDays;

  public TelegramAgingScheduler(
      TelegramClient telegram,
      IdentityClient identity,
      AssetClient assets,
      BotStateRepository state,
      @Value("${telegram.aging.enabled:true}") boolean enabled,
      @Value("${telegram.aging.days:1095}") int agingDays,
      @Value("${telegram.aging.period-days:30}") int periodDays
  ) {
    this.telegram = telegram;
    this.identity = identity;
    this.assets = assets;
    this.state = state;
    this.enabled = enabled;
    this.agingDays = Math.max(0, agingDays);
    this.periodDays = Math.max(1, periodDays);
  }

  @Scheduled(cron = "${telegram.aging.cron:0 15 9 * * *}")
  public void runDaily() {
    if (!enabled) return;
    if (!telegram.isEnabled()) return;

    List<IdentityUser> users = identity.listUsers();
    if (users == null || users.isEmpty()) return;

    Instant now = Instant.now();
    LocalDate thresholdDate = LocalDate.now().minusDays(agingDays);
    Instant thresholdInstant = now.minus(agingDays, ChronoUnit.DAYS);

    for (IdentityUser u : users) {
      if (u == null || u.telegramChatId() == null) continue;
      if (u.roles() == null || u.roles().stream().noneMatch(r -> "EMPLOYEE".equals(r))) continue;

      Instant last = state.getLastAgingSent(u.id()).orElse(null);
      if (last != null && last.isAfter(now.minus(periodDays, ChronoUnit.DAYS))) {
        continue;
      }

      PageResponse<AssignedAsset> page = assets.listAssignedAssets(u.id(), 0, 100);
      if (page == null || page.items() == null || page.items().isEmpty()) continue;

      List<AssignedAsset> aging = page.items().stream()
          .filter(x -> isAging(x, thresholdDate, thresholdInstant))
          .toList();
      if (aging.isEmpty()) continue;

      sendAging(u, aging);
      state.setLastAgingSent(u.id(), now);
    }
  }

  private static boolean isAging(AssignedAsset item, LocalDate thresholdDate, Instant thresholdInstant) {
    if (item == null || item.asset() == null) return false;
    var a = item.asset();
    if (a.purchaseDate() != null) {
      return !a.purchaseDate().isAfter(thresholdDate);
    }
    if (a.createdAt() != null) {
      return !a.createdAt().isAfter(thresholdInstant);
    }
    return false;
  }

  private void sendAging(IdentityUser u, List<AssignedAsset> aging) {
    long chatId = u.telegramChatId();
    List<AssignedAsset> items = aging.stream().filter(x -> x != null && x.asset() != null).toList();
    if (items.isEmpty()) return;

    StringBuilder sb = new StringBuilder();
    sb.append(u.fullName() == null ? "Xodim" : u.fullName())
        .append(", sizga biriktirilgan ba'zi aktivlar eskirgan (>")
        .append(agingDays)
        .append(" kun).")
        .append("\n\n");

    int limit = Math.min(10, items.size());
    for (int i = 0; i < limit; i++) {
      var a = items.get(i).asset();
      sb.append(i + 1).append(". ").append(a.name() == null ? "-" : a.name());
      if (a.serialNumber() != null && !a.serialNumber().isBlank()) {
        sb.append(" (").append(a.serialNumber()).append(")");
      }
      sb.append("\n");
    }
    if (items.size() > limit) {
      sb.append("\n").append("... +").append(items.size() - limit).append(" ta");
    }

    sb.append("\n\nIltimos IT bo'limiga murojaat qiling. Ko'rish: /myassets");

    telegram.sendMessage(chatId, sb.toString().trim());
  }
}


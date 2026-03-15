package com.smartbanking.telegram.bot;

import com.smartbanking.telegram.telegram.TelegramClient;
import com.smartbanking.telegram.telegram.TelegramModels.Update;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class TelegramUpdatePoller {
  private static final Logger log = LoggerFactory.getLogger(TelegramUpdatePoller.class);

  private final TelegramClient telegramClient;
  private final BotStateRepository state;
  private final TelegramBotHandler handler;
  private final boolean enabled;
  private final int limit;
  private final int timeoutSeconds;

  public TelegramUpdatePoller(
      TelegramClient telegramClient,
      BotStateRepository state,
      TelegramBotHandler handler,
      @Value("${telegram.polling.enabled:true}") boolean enabled,
      @Value("${telegram.polling.limit:50}") int limit,
      @Value("${telegram.polling.timeout-seconds:20}") int timeoutSeconds
  ) {
    this.telegramClient = telegramClient;
    this.state = state;
    this.handler = handler;
    this.enabled = enabled;
    this.limit = limit;
    this.timeoutSeconds = timeoutSeconds;
  }

  @Scheduled(fixedDelayString = "${telegram.polling.delay-ms:1100}")
  public void poll() {
    if (!enabled) return;
    if (!telegramClient.isEnabled()) return;

    long last = state.getLastUpdateId();
    long offset = last <= 0 ? 0 : last + 1;
    List<Update> updates = telegramClient.getUpdates(offset, limit, timeoutSeconds);
    if (updates.isEmpty()) return;

    for (Update u : updates) {
      try {
        handler.handle(u);
      } catch (Exception e) {
        log.warn("Telegram update processing failed updateId={}", u.updateId(), e);
      } finally {
        state.setLastUpdateId(u.updateId());
      }
    }
  }
}


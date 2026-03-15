package com.smartbanking.telegram.telegram;

import com.smartbanking.telegram.telegram.TelegramModels.ApiResponse;
import com.smartbanking.telegram.telegram.TelegramModels.InlineKeyboardMarkup;
import com.smartbanking.telegram.telegram.TelegramModels.Update;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class TelegramClient {
  private static final Logger log = LoggerFactory.getLogger(TelegramClient.class);

  private final String botToken;
  private final RestClient http;

  public TelegramClient(@Value("${telegram.bot.token:}") String botToken) {
    this.botToken = botToken == null ? "" : botToken.trim();
    String baseUrl = this.botToken.isBlank()
        ? "https://api.telegram.org"
        : "https://api.telegram.org/bot" + this.botToken;
    this.http = RestClient.builder().baseUrl(baseUrl).build();
  }

  public boolean isEnabled() {
    return !botToken.isBlank();
  }

  public List<Update> getUpdates(long offset, int limit, int timeoutSeconds) {
    if (!isEnabled()) return List.of();
    try {
      ApiResponse<List<Update>> resp = http.get()
          .uri(uriBuilder -> uriBuilder
              .path("/getUpdates")
              .queryParam("offset", offset)
              .queryParam("limit", limit)
              .queryParam("timeout", timeoutSeconds)
              .build())
          .retrieve()
          .body(new org.springframework.core.ParameterizedTypeReference<ApiResponse<List<Update>>>() {});
      if (resp == null || !resp.ok() || resp.result() == null) {
        return List.of();
      }
      return resp.result();
    } catch (Exception e) {
      log.warn("Telegram getUpdates failed: {}", e.getMessage());
      return List.of();
    }
  }

  public void sendMessage(long chatId, String text) {
    sendMessage(chatId, text, null);
  }

  public void sendMessage(long chatId, String text, InlineKeyboardMarkup keyboard) {
    if (!isEnabled()) return;
    try {
      Map<String, Object> body = new java.util.HashMap<>();
      body.put("chat_id", chatId);
      body.put("text", text == null ? "" : text);
      body.put("disable_web_page_preview", true);
      if (keyboard != null) {
        body.put("reply_markup", keyboard);
      }
      http.post()
          .uri("/sendMessage")
          .contentType(MediaType.APPLICATION_JSON)
          .body(body)
          .retrieve()
          .body(Object.class);
    } catch (Exception e) {
      log.warn("Telegram sendMessage failed chatId={}: {}", chatId, e.getMessage());
    }
  }

  public void answerCallbackQuery(String callbackQueryId, String text) {
    if (!isEnabled()) return;
    if (callbackQueryId == null || callbackQueryId.isBlank()) return;
    try {
      Map<String, Object> body = Map.of(
          "callback_query_id", callbackQueryId,
          "text", text == null ? "" : text,
          "show_alert", false
      );
      http.post()
          .uri("/answerCallbackQuery")
          .contentType(MediaType.APPLICATION_JSON)
          .body(body)
          .retrieve()
          .body(Object.class);
    } catch (Exception e) {
      log.debug("Telegram answerCallbackQuery failed: {}", e.getMessage());
    }
  }
}


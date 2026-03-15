package com.smartbanking.telegram.telegram;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public final class TelegramModels {
  private TelegramModels() {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record ApiResponse<T>(boolean ok, T result, String description) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Update(
      @JsonProperty("update_id") long updateId,
      Message message,
      @JsonProperty("callback_query") CallbackQuery callbackQuery
  ) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Message(
      long message_id,
      From from,
      Chat chat,
      String text
  ) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record CallbackQuery(
      String id,
      From from,
      Message message,
      String data
  ) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Chat(long id, String type) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record From(long id, String username, @JsonProperty("first_name") String firstName, @JsonProperty("last_name") String lastName) {}

  public record InlineKeyboardMarkup(@JsonProperty("inline_keyboard") List<List<InlineKeyboardButton>> inlineKeyboard) {}

  public record InlineKeyboardButton(String text, @JsonProperty("callback_data") String callbackData) {}
}


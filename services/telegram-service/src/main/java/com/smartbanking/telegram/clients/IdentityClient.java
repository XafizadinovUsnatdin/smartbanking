package com.smartbanking.telegram.clients;

import com.smartbanking.telegram.clients.dto.IdentityUser;
import com.smartbanking.telegram.security.ServiceAuth;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

@Component
public class IdentityClient {
  private static final Logger log = LoggerFactory.getLogger(IdentityClient.class);

  private final RestClient http;
  private final ServiceAuth serviceAuth;

  public IdentityClient(@Value("${services.identity-base}") String baseUrl, ServiceAuth serviceAuth) {
    this.http = RestClient.builder().baseUrl(baseUrl).build();
    this.serviceAuth = serviceAuth;
  }

  public List<IdentityUser> listUsers() {
    return http.get()
        .uri("/users")
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceAuth.serviceToken())
        .retrieve()
        .body(new org.springframework.core.ParameterizedTypeReference<List<IdentityUser>>() {});
  }

  public IdentityUser getUser(UUID userId) {
    return http.get()
        .uri("/users/{id}", userId)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceAuth.serviceToken())
        .retrieve()
        .body(IdentityUser.class);
  }

  public Optional<IdentityUser> lookupByTelegramUserId(long telegramUserId) {
    try {
      IdentityUser user = http.get()
          .uri(uriBuilder -> uriBuilder.path("/users/lookup").queryParam("telegramUserId", telegramUserId).build())
          .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceAuth.serviceToken())
          .retrieve()
          .body(IdentityUser.class);
      return Optional.ofNullable(user);
    } catch (HttpClientErrorException.NotFound e) {
      return Optional.empty();
    } catch (HttpClientErrorException e) {
      log.warn("Identity lookupByTelegramUserId failed status={} msg={}", e.getStatusCode(), e.getMessage());
      return Optional.empty();
    }
  }

  public Optional<IdentityUser> lookupByTelegramUsername(String telegramUsername) {
    if (telegramUsername == null || telegramUsername.isBlank()) {
      return Optional.empty();
    }
    String normalized = telegramUsername.trim();
    if (normalized.startsWith("@")) normalized = normalized.substring(1);
    if (normalized.isBlank()) return Optional.empty();
    final String username = normalized;

    try {
      IdentityUser user = http.get()
          .uri(uriBuilder -> uriBuilder.path("/users/lookup").queryParam("telegramUsername", username).build())
          .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceAuth.serviceToken())
          .retrieve()
          .body(IdentityUser.class);
      return Optional.ofNullable(user);
    } catch (HttpClientErrorException.NotFound e) {
      return Optional.empty();
    } catch (HttpClientErrorException e) {
      log.warn("Identity lookupByTelegramUsername failed status={} msg={}", e.getStatusCode(), e.getMessage());
      return Optional.empty();
    }
  }

  public IdentityUser updateContacts(UUID userId, UpdateContactsRequest req) {
    return http.put()
        .uri("/users/{id}/contacts", userId)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceAuth.serviceToken())
        .body(req)
        .retrieve()
        .body(IdentityUser.class);
  }

  public record UpdateContactsRequest(
      String phoneNumber,
      String telegramUsername,
      Long telegramUserId,
      Long telegramChatId
  ) {}
}

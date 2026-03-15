package com.smartbanking.telegram.clients.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record IdentityUser(
    UUID id,
    String username,
    String fullName,
    UUID departmentId,
    UUID branchId,
    String phoneNumber,
    String telegramUsername,
    Long telegramUserId,
    Long telegramChatId,
    List<String> roles,
    Instant createdAt
) {}


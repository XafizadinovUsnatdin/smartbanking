package com.smartbanking.telegram.clients.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record IdentityDepartment(
    UUID id,
    String name,
    UUID branchId,
    String phoneNumber,
    String telegramUsername,
    Long telegramChatId
) {}


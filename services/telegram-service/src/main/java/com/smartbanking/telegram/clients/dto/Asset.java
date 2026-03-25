package com.smartbanking.telegram.clients.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record Asset(
    UUID id,
    String name,
    String type,
    String categoryCode,
    String serialNumber,
    String status,
    LocalDate purchaseDate,
    Instant createdAt
) {}

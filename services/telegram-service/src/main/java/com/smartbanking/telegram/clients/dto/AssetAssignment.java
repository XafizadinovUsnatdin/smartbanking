package com.smartbanking.telegram.clients.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Instant;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AssetAssignment(
    UUID id,
    UUID assetId,
    String ownerType,
    UUID ownerId,
    Instant assignedAt,
    String assignedBy,
    String assignReason,
    Instant returnedAt,
    String returnedBy,
    String returnReason
) {}


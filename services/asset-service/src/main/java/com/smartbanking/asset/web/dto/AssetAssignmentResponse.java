package com.smartbanking.asset.web.dto;

import com.smartbanking.asset.domain.OwnerType;
import java.time.Instant;
import java.util.UUID;

public record AssetAssignmentResponse(
    UUID id,
    UUID assetId,
    OwnerType ownerType,
    UUID ownerId,
    Instant assignedAt,
    String assignedBy,
    String assignReason,
    Instant returnedAt,
    String returnedBy,
    String returnReason
) {}


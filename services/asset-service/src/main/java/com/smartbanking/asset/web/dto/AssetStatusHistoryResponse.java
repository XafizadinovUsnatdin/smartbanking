package com.smartbanking.asset.web.dto;

import com.smartbanking.asset.domain.AssetStatus;
import java.time.Instant;
import java.util.UUID;

public record AssetStatusHistoryResponse(
    UUID id,
    UUID assetId,
    AssetStatus fromStatus,
    AssetStatus toStatus,
    String reason,
    String changedBy,
    Instant changedAt
) {}


package com.smartbanking.asset.web.dto;

import java.time.Instant;
import java.util.UUID;

public record AssetPhotoResponse(
    UUID id,
    UUID assetId,
    String filename,
    String contentType,
    long sizeBytes,
    Instant createdAt,
    String createdBy,
    String downloadUrl
) {}


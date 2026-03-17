package com.smartbanking.telegram.clients.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Instant;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AssetPhoto(
    UUID id,
    UUID assetId,
    String filename,
    String contentType,
    long sizeBytes,
    Instant createdAt,
    String createdBy,
    String downloadUrl
) {}

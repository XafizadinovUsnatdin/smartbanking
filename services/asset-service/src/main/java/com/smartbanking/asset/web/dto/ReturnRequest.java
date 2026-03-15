package com.smartbanking.asset.web.dto;

import com.smartbanking.asset.domain.AssetStatus;
import jakarta.validation.constraints.Size;

public record ReturnRequest(
    @Size(max = 400) String reason,
    AssetStatus nextStatus
) {}


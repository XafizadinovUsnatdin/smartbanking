package com.smartbanking.asset.web.dto;

import com.smartbanking.asset.domain.AssetStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ChangeStatusRequest(
    @NotNull AssetStatus toStatus,
    @Size(max = 400) String reason
) {}


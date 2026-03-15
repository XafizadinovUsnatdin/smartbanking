package com.smartbanking.asset.web.dto;

import com.smartbanking.asset.domain.OwnerType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record AssignRequest(
    @NotNull OwnerType ownerType,
    @NotNull UUID ownerId,
    @Size(max = 400) String reason
) {}


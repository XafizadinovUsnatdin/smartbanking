package com.smartbanking.asset.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record UpdateAssetRequest(
    @NotBlank @Size(max = 200) String name,
    @NotBlank @Size(max = 120) String type,
    @NotBlank @Size(max = 50) String categoryCode,
    @NotBlank @Size(max = 120) String serialNumber,
    @Size(max = 1000) String description,
    @Size(max = 120) String inventoryTag,
    @Size(max = 120) String model,
    @Size(max = 120) String vendor,
    LocalDate purchaseDate,
    LocalDate warrantyUntil,
    BigDecimal cost
) {}

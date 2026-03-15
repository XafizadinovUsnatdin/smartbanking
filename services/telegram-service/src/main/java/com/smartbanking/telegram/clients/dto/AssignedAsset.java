package com.smartbanking.telegram.clients.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AssignedAsset(Asset asset, AssetAssignment assignment) {}


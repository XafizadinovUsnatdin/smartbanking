package com.smartbanking.qr.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class QrViewService {
  private final QrTokenService tokenService;
  private final RestClient assetClient;
  private final RestClient identityClient;

  public QrViewService(
      QrTokenService tokenService,
      @Value("${services.asset.base-url}") String assetBaseUrl,
      @Value("${services.identity.base-url}") String identityBaseUrl
  ) {
    this.tokenService = tokenService;
    this.assetClient = RestClient.builder().baseUrl(assetBaseUrl).build();
    this.identityClient = RestClient.builder().baseUrl(identityBaseUrl).build();
  }

  public QrAssetView view(String token, String authorizationHeader) {
    UUID assetId = tokenService.resolveAssetId(token);

    AssetDto asset = assetClient.get()
        .uri("/assets/{id}", assetId)
        .header(HttpHeaders.AUTHORIZATION, authorizationHeader)
        .retrieve()
        .body(AssetDto.class);

    ResponseEntity<AssignmentDto> assignmentResp = assetClient.get()
        .uri("/assets/{id}/assignment", assetId)
        .header(HttpHeaders.AUTHORIZATION, authorizationHeader)
        .retrieve()
        .toEntity(AssignmentDto.class);
    AssignmentDto assignment = assignmentResp.getBody();

    List<PhotoDto> photos = assetClient.get()
        .uri("/assets/{id}/photos", assetId)
        .header(HttpHeaders.AUTHORIZATION, authorizationHeader)
        .retrieve()
        .body(new ParameterizedTypeReference<>() {});

    OwnerDto owner = null;
    if (assignment != null) {
      String displayName = null;
      if ("EMPLOYEE".equalsIgnoreCase(assignment.ownerType())) {
        UserDto user = identityClient.get()
            .uri("/users/{id}/public", assignment.ownerId())
            .header(HttpHeaders.AUTHORIZATION, authorizationHeader)
            .retrieve()
            .body(UserDto.class);
        displayName = user == null ? null : user.fullName();
      } else if ("DEPARTMENT".equalsIgnoreCase(assignment.ownerType())) {
        DepartmentDto dept = identityClient.get()
            .uri("/departments/{id}/public", assignment.ownerId())
            .header(HttpHeaders.AUTHORIZATION, authorizationHeader)
            .retrieve()
            .body(DepartmentDto.class);
        displayName = dept == null ? null : dept.name();
      } else if ("BRANCH".equalsIgnoreCase(assignment.ownerType())) {
        BranchDto branch = identityClient.get()
            .uri("/branches/{id}/public", assignment.ownerId())
            .header(HttpHeaders.AUTHORIZATION, authorizationHeader)
            .retrieve()
            .body(BranchDto.class);
        displayName = branch == null ? null : branch.name();
      }
      owner = new OwnerDto(assignment.ownerType(), assignment.ownerId(), displayName);
    }

    return new QrAssetView(asset, owner, photos == null ? List.of() : photos);
  }

  public record QrAssetView(AssetDto asset, OwnerDto owner, List<PhotoDto> photos) {}

  public record AssetDto(
      UUID id,
      String name,
      String type,
      String categoryCode,
      String serialNumber,
      String inventoryTag,
      String model,
      String vendor,
      String status,
      Instant createdAt,
      Instant updatedAt
  ) {}

  public record AssignmentDto(
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

  public record PhotoDto(
      UUID id,
      UUID assetId,
      String filename,
      String contentType,
      long sizeBytes,
      Instant createdAt,
      String createdBy,
      String downloadUrl
  ) {}

  public record OwnerDto(String ownerType, UUID ownerId, String displayName) {}

  public record UserDto(UUID id, String fullName) {}

  public record DepartmentDto(UUID id, String name) {}

  public record BranchDto(UUID id, String name) {}
}

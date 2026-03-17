package com.smartbanking.telegram.clients;

import com.smartbanking.telegram.clients.dto.Asset;
import com.smartbanking.telegram.clients.dto.AssetAssignment;
import com.smartbanking.telegram.clients.dto.AssignedAsset;
import com.smartbanking.telegram.clients.dto.AssetPhoto;
import com.smartbanking.telegram.clients.dto.PageResponse;
import com.smartbanking.telegram.security.ServiceAuth;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

@Component
public class AssetClient {
  private static final Logger log = LoggerFactory.getLogger(AssetClient.class);

  private final RestClient http;
  private final ServiceAuth serviceAuth;

  public AssetClient(@org.springframework.beans.factory.annotation.Value("${services.asset-base}") String baseUrl, ServiceAuth serviceAuth) {
    this.http = RestClient.builder().baseUrl(baseUrl).build();
    this.serviceAuth = serviceAuth;
  }

  public Asset getAsset(UUID assetId) {
    return http.get()
        .uri("/assets/{id}", assetId)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceAuth.serviceToken())
        .retrieve()
        .body(Asset.class);
  }

  public PageResponse<AssignedAsset> listAssignedAssets(UUID ownerId, int page, int size) {
    return http.get()
        .uri(uriBuilder -> uriBuilder
            .path("/assets/assigned")
            .queryParam("ownerType", "EMPLOYEE")
            .queryParam("ownerId", ownerId)
            .queryParam("page", page)
            .queryParam("size", size)
            .build())
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceAuth.serviceToken())
        .retrieve()
        .body(new ParameterizedTypeReference<PageResponse<AssignedAsset>>() {});
  }

  public List<AssetCategory> listCategories() {
    return http.get()
        .uri("/asset-categories")
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceAuth.serviceToken())
        .retrieve()
        .body(new ParameterizedTypeReference<List<AssetCategory>>() {});
  }

  public List<AssetPhoto> listPhotos(UUID assetId) {
    return http.get()
        .uri("/assets/{id}/photos", assetId)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceAuth.serviceToken())
        .retrieve()
        .body(new ParameterizedTypeReference<List<AssetPhoto>>() {});
  }

  public PhotoDownload downloadPhoto(UUID photoId) {
    ResponseEntity<byte[]> resp = http.get()
        .uri("/assets/photos/{id}", photoId)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceAuth.serviceToken())
        .retrieve()
        .toEntity(byte[].class);
    byte[] body = resp.getBody() == null ? new byte[0] : resp.getBody();
    String contentType = resp.getHeaders().getContentType() == null
        ? "application/octet-stream"
        : resp.getHeaders().getContentType().toString();
    return new PhotoDownload(body, contentType);
  }

  public Optional<AssetAssignment> currentAssignment(UUID assetId) {
    try {
      var entity = http.get()
          .uri("/assets/{id}/assignment", assetId)
          .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceAuth.serviceToken())
          .retrieve()
          .toEntity(AssetAssignment.class);
      return Optional.ofNullable(entity == null ? null : entity.getBody());
    } catch (HttpClientErrorException.NotFound e) {
      return Optional.empty();
    } catch (HttpClientErrorException e) {
      log.warn("Asset currentAssignment failed status={} msg={}", e.getStatusCode(), e.getMessage());
      return Optional.empty();
    }
  }

  public void changeStatusAs(UUID assetId, String toStatus, String reason, String bearerToken) {
    http.post()
        .uri("/assets/{id}/status", assetId)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken)
        .body(Map.of("toStatus", toStatus, "reason", reason))
        .retrieve()
        .toBodilessEntity();
  }

  public Map<String, Object> createAssetRequestAs(UUID requesterId, String requesterUsername, List<String> requesterRoles, CreateAssetRequest body) {
    String token = serviceAuth.asUserToken(requesterId, requesterUsername, requesterRoles);
    return http.post()
        .uri("/asset-requests")
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
        .body(body)
        .retrieve()
        .body(new ParameterizedTypeReference<Map<String, Object>>() {});
  }

  public record CreateAssetRequest(String note, List<CreateAssetRequestItem> items) {}

  public record CreateAssetRequestItem(String type, String categoryCode, int quantity) {}

  public record PhotoDownload(byte[] bytes, String contentType) {}

  public record AssetCategory(String code, String name) {}
}

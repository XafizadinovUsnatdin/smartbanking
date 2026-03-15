package com.smartbanking.asset.web;

import com.smartbanking.asset.domain.AssetPhoto;
import com.smartbanking.asset.repo.AssetPhotoRepository;
import com.smartbanking.asset.service.AssetPhotoStorage;
import com.smartbanking.asset.service.AssetService;
import com.smartbanking.asset.web.dto.AssetPhotoResponse;
import java.nio.file.Files;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/assets")
public class AssetPhotoController {
  private final AssetService assetService;
  private final AssetPhotoRepository photoRepo;
  private final AssetPhotoStorage storage;

  public AssetPhotoController(AssetService assetService, AssetPhotoRepository photoRepo, AssetPhotoStorage storage) {
    this.assetService = assetService;
    this.photoRepo = photoRepo;
    this.storage = storage;
  }

  @PostMapping("/{assetId}/photos")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER')")
  public AssetPhotoResponse upload(@PathVariable UUID assetId,
                                   @RequestPart("file") MultipartFile file,
                                   Authentication auth) {
    assetService.get(assetId);
    if (file == null || file.isEmpty()) {
      throw new BadRequestException("file is required");
    }
    String contentType = file.getContentType();
    if (!StringUtils.hasText(contentType) || !contentType.toLowerCase().startsWith("image/")) {
      throw new BadRequestException("Only image/* content types are allowed");
    }
    UUID photoId = UUID.randomUUID();
    AssetPhotoStorage.StoredFile stored = storage.store(assetId, photoId, file);
    AssetPhoto photo = new AssetPhoto(
        photoId,
        assetId,
        StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename() : "photo",
        contentType,
        file.getSize(),
        stored.storagePath(),
        Instant.now(),
        auth == null ? "anonymous" : String.valueOf(auth.getPrincipal())
    );
    photoRepo.save(photo);
    return toResponse(photo);
  }

  @GetMapping("/{assetId}/photos")
  public List<AssetPhotoResponse> list(@PathVariable UUID assetId) {
    assetService.get(assetId);
    return photoRepo.findAllByAssetIdOrderByCreatedAtDesc(assetId).stream().map(AssetPhotoController::toResponse).toList();
  }

  public record BulkLatestPhotosRequest(List<UUID> assetIds) {}
  public record LatestPhotoResponse(UUID assetId, UUID photoId, String downloadUrl) {}

  @PostMapping("/photos/latest")
  public List<LatestPhotoResponse> latest(@RequestBody BulkLatestPhotosRequest req) {
    if (req == null || req.assetIds() == null || req.assetIds().isEmpty()) {
      return List.of();
    }
    return photoRepo.findLatestByAssetIds(req.assetIds()).stream()
        .map(p -> new LatestPhotoResponse(p.getAssetId(), p.getId(), "/assets/photos/" + p.getId()))
        .toList();
  }

  @GetMapping("/photos/{photoId}")
  public ResponseEntity<Resource> download(@PathVariable UUID photoId) {
    AssetPhoto photo = photoRepo.findById(photoId).orElseThrow(() -> new NotFoundException("Photo not found"));
    try {
      byte[] bytes = Files.readAllBytes(storage.resolve(photo.getStoragePath()));
      Resource resource = new ByteArrayResource(bytes);
      return ResponseEntity.ok()
          .contentType(MediaType.parseMediaType(photo.getContentType()))
          .header(HttpHeaders.CACHE_CONTROL, "max-age=3600")
          .body(resource);
    } catch (Exception e) {
      throw new RuntimeException("Failed to read photo", e);
    }
  }

  private static AssetPhotoResponse toResponse(AssetPhoto p) {
    return new AssetPhotoResponse(
        p.getId(),
        p.getAssetId(),
        p.getFilename(),
        p.getContentType(),
        p.getSizeBytes(),
        p.getCreatedAt(),
        p.getCreatedBy(),
        "/assets/photos/" + p.getId()
    );
  }
}

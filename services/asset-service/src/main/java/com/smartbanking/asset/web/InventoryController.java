package com.smartbanking.asset.web;

import com.smartbanking.asset.domain.Asset;
import com.smartbanking.asset.domain.InventoryScan;
import com.smartbanking.asset.domain.InventorySession;
import com.smartbanking.asset.domain.InventorySessionStatus;
import com.smartbanking.asset.domain.OwnerType;
import com.smartbanking.asset.repo.InventoryScanRepository;
import com.smartbanking.asset.service.InventoryService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/inventories")
public class InventoryController {
  private final InventoryService inventoryService;
  private final InventoryScanRepository scanRepo;

  public InventoryController(InventoryService inventoryService, InventoryScanRepository scanRepo) {
    this.inventoryService = inventoryService;
    this.scanRepo = scanRepo;
  }

  public record InventorySessionResponse(
      UUID id,
      String name,
      OwnerType ownerType,
      UUID ownerId,
      InventorySessionStatus status,
      Instant createdAt,
      String createdBy,
      Instant closedAt,
      String closedBy,
      int expectedCount,
      long scannedCount
  ) {}

  public record CreateInventorySessionRequest(
      @NotBlank @Size(max = 200) String name,
      @NotNull OwnerType ownerType,
      @NotNull UUID ownerId
  ) {}

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER')")
  @ResponseStatus(HttpStatus.CREATED)
  public InventorySessionResponse create(@Valid @RequestBody CreateInventorySessionRequest req, Authentication auth) {
    InventorySession session = inventoryService.create(req.name(), req.ownerType(), req.ownerId(), actor(auth), null);
    return toResponse(session);
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER','AUDITOR')")
  public List<InventorySessionResponse> list() {
    return inventoryService.list().stream().map(this::toResponse).toList();
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER','AUDITOR')")
  public InventorySessionResponse get(@PathVariable UUID id) {
    return toResponse(inventoryService.get(id));
  }

  public record ScanRequest(@NotNull UUID assetId, @Size(max = 400) String note) {}

  public record InventoryScanResponse(UUID id, UUID sessionId, UUID assetId, Instant scannedAt, String scannedBy, String note) {}

  @PostMapping("/{id}/scan")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER')")
  public InventoryScanResponse scan(@PathVariable UUID id, @Valid @RequestBody ScanRequest req, Authentication auth) {
    InventoryScan scan = inventoryService.scan(id, req.assetId(), req.note(), actor(auth), null);
    return new InventoryScanResponse(scan.getId(), scan.getSessionId(), scan.getAssetId(), scan.getScannedAt(), scan.getScannedBy(), scan.getNote());
  }

  @PostMapping("/{id}/close")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER')")
  public InventorySessionResponse close(@PathVariable UUID id, Authentication auth) {
    return toResponse(inventoryService.close(id, actor(auth), null));
  }

  public record AssetSummary(UUID id, String name, String serialNumber, String status, String categoryCode) {}

  public record InventoryReportResponse(
      UUID sessionId,
      int expectedCount,
      long scannedCount,
      List<AssetSummary> missing,
      List<AssetSummary> unexpected
  ) {}

  @GetMapping("/{id}/report")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER','AUDITOR')")
  public InventoryReportResponse report(@PathVariable UUID id) {
    var report = inventoryService.report(id);
    InventorySession session = report.session();
    return new InventoryReportResponse(
        session.getId(),
        session.getExpectedAssetIds() == null ? 0 : session.getExpectedAssetIds().size(),
        report.scannedCount(),
        report.missing().stream().map(InventoryController::toSummary).toList(),
        report.unexpected().stream().map(InventoryController::toSummary).toList()
    );
  }

  private InventorySessionResponse toResponse(InventorySession s) {
    long scannedCount = scanRepo.countBySessionId(s.getId());
    return new InventorySessionResponse(
        s.getId(),
        s.getName(),
        s.getOwnerType(),
        s.getOwnerId(),
        s.getStatus(),
        s.getCreatedAt(),
        s.getCreatedBy(),
        s.getClosedAt(),
        s.getClosedBy(),
        s.getExpectedAssetIds() == null ? 0 : s.getExpectedAssetIds().size(),
        scannedCount
    );
  }

  private static AssetSummary toSummary(Asset a) {
    return new AssetSummary(a.getId(), a.getName(), a.getSerialNumber(), a.getStatus().name(), a.getCategoryCode());
  }

  private static String actor(Authentication auth) {
    return auth == null ? "anonymous" : String.valueOf(auth.getPrincipal());
  }
}


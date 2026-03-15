package com.smartbanking.asset.web;

import com.smartbanking.asset.domain.Asset;
import com.smartbanking.asset.domain.AssetAssignment;
import com.smartbanking.asset.domain.AssetStatus;
import com.smartbanking.asset.domain.AssetStatusHistory;
import com.smartbanking.asset.domain.OwnerType;
import com.smartbanking.asset.service.AssetService;
import com.smartbanking.asset.web.dto.AssetAssignmentResponse;
import com.smartbanking.asset.web.dto.AssetStatusHistoryResponse;
import com.smartbanking.asset.web.dto.AssignRequest;
import com.smartbanking.asset.web.dto.ChangeStatusRequest;
import com.smartbanking.asset.web.dto.CreateAssetRequest;
import com.smartbanking.asset.web.dto.ReturnRequest;
import com.smartbanking.asset.web.dto.UpdateAssetRequest;
import com.smartbanking.common.dto.PageResponse;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/assets")
public class AssetController {
  private final AssetService assetService;

  public AssetController(AssetService assetService) {
    this.assetService = assetService;
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER')")
  @ResponseStatus(HttpStatus.CREATED)
  public Asset create(@Valid @RequestBody CreateAssetRequest req, Authentication auth) {
    return assetService.create(req, actor(auth), null);
  }

  @GetMapping
  public PageResponse<Asset> list(
      @RequestParam Optional<String> q,
      @RequestParam Optional<String> categoryCode,
      @RequestParam Optional<AssetStatus> status,
      @PageableDefault(size = 20) Pageable pageable
  ) {
    var page = assetService.search(q, categoryCode, status, pageable);
    return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
  }

  @GetMapping("/aging")
  public PageResponse<Asset> aging(
      @RequestParam(defaultValue = "365") int days,
      @RequestParam Optional<String> q,
      @RequestParam Optional<String> categoryCode,
      @RequestParam Optional<AssetStatus> status,
      @RequestParam(defaultValue = "false") boolean includeTerminal,
      @PageableDefault(size = 20) Pageable pageable
  ) {
    var page = assetService.aging(days, q, categoryCode, status, includeTerminal, pageable);
    return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
  }

  public record AssignedAssetResponse(Asset asset, AssetAssignmentResponse assignment) {}

  @GetMapping("/assigned")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER','AUDITOR')")
  public PageResponse<AssignedAssetResponse> assignedToOwner(
      @RequestParam OwnerType ownerType,
      @RequestParam UUID ownerId,
      @RequestParam Optional<String> q,
      @RequestParam Optional<String> categoryCode,
      @RequestParam Optional<AssetStatus> status,
      @PageableDefault(size = 20) Pageable pageable
  ) {
    var page = assetService.assignedToOwner(ownerType, ownerId, q, categoryCode, status, pageable);
    if (page.getContent().isEmpty()) {
      return new PageResponse<>(List.of(), page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    List<UUID> assetIds = page.getContent().stream().map(Asset::getId).toList();
    Map<UUID, AssetAssignment> byAssetId = new HashMap<>();
    for (AssetAssignment a : assetService.currentAssignments(assetIds)) {
      if (a.getReturnedAt() != null) continue;
      if (a.getOwnerType() != ownerType) continue;
      if (!a.getOwnerId().equals(ownerId)) continue;
      byAssetId.put(a.getAssetId(), a);
    }

    var items = page.getContent().stream()
        .map(a -> new AssignedAssetResponse(a, byAssetId.get(a.getId()) == null ? null : toResponse(byAssetId.get(a.getId()))))
        .toList();
    return new PageResponse<>(items, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
  }

  @GetMapping("/{id}")
  public Asset get(@PathVariable UUID id) {
    return assetService.get(id);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER')")
  public Asset update(@PathVariable UUID id, @Valid @RequestBody UpdateAssetRequest req, Authentication auth) {
    return assetService.update(id, req, actor(auth), null);
  }

  @PostMapping("/{id}/assign")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER')")
  public Asset assign(@PathVariable UUID id, @Valid @RequestBody AssignRequest req, Authentication auth) {
    return assetService.assign(id, req, actor(auth), null);
  }

  @GetMapping("/{id}/assignment")
  public ResponseEntity<AssetAssignmentResponse> currentAssignment(@PathVariable UUID id) {
    return assetService.currentAssignment(id)
        .map(a -> ResponseEntity.ok(toResponse(a)))
        .orElseGet(() -> ResponseEntity.noContent().build());
  }

  public record BulkCurrentAssignmentsRequest(List<UUID> assetIds) {}

  @PostMapping("/assignments/current")
  public List<AssetAssignmentResponse> currentAssignments(@RequestBody BulkCurrentAssignmentsRequest req) {
    if (req == null || req.assetIds() == null || req.assetIds().isEmpty()) {
      return List.of();
    }
    return assetService.currentAssignments(req.assetIds()).stream().map(AssetController::toResponse).toList();
  }

  @GetMapping("/{id}/assignments")
  public List<AssetAssignmentResponse> assignmentHistory(@PathVariable UUID id) {
    return assetService.assignmentHistory(id).stream().map(AssetController::toResponse).toList();
  }

  @GetMapping("/{id}/status-history")
  public List<AssetStatusHistoryResponse> statusHistory(@PathVariable UUID id) {
    return assetService.statusHistory(id).stream().map(AssetController::toResponse).toList();
  }

  @PostMapping("/{id}/return")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER')")
  public Asset returnAsset(@PathVariable UUID id, @Valid @RequestBody ReturnRequest req, Authentication auth) {
    return assetService.returnAsset(id, req, actor(auth), null);
  }

  @PostMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER')")
  public Asset changeStatus(@PathVariable UUID id, @Valid @RequestBody ChangeStatusRequest req, Authentication auth) {
    return assetService.changeStatus(id, req, actor(auth), null);
  }

  public record ActiveOwnerSummaryResponse(OwnerType ownerType, UUID ownerId, long count) {}

  @GetMapping("/assignments/active-summary")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER','AUDITOR')")
  public List<ActiveOwnerSummaryResponse> activeOwnerSummary() {
    return assetService.activeOwnerSummary().stream()
        .map(s -> new ActiveOwnerSummaryResponse(s.ownerType(), s.ownerId(), s.count()))
        .toList();
  }

  public record AvailableSummaryResponse(String categoryCode, String type, long count) {}

  @GetMapping("/available-summary")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER','AUDITOR')")
  public List<AvailableSummaryResponse> availableSummary(@RequestParam(defaultValue = "REGISTERED") AssetStatus status) {
    return assetService.availableSummary(status).stream()
        .map(s -> new AvailableSummaryResponse(s.categoryCode(), s.type(), s.count()))
        .toList();
  }

  public record DeleteAssetRequest(String reason) {}

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id, @RequestBody(required = false) DeleteAssetRequest req, Authentication auth) {
    assetService.delete(id, req == null ? null : req.reason(), actor(auth), null);
  }

  private static String actor(Authentication auth) {
    return auth == null ? "anonymous" : String.valueOf(auth.getPrincipal());
  }

  private static AssetAssignmentResponse toResponse(AssetAssignment a) {
    return new AssetAssignmentResponse(
        a.getId(),
        a.getAssetId(),
        a.getOwnerType(),
        a.getOwnerId(),
        a.getAssignedAt(),
        a.getAssignedBy(),
        a.getAssignReason(),
        a.getReturnedAt(),
        a.getReturnedBy(),
        a.getReturnReason()
    );
  }

  private static AssetStatusHistoryResponse toResponse(AssetStatusHistory h) {
    return new AssetStatusHistoryResponse(
        h.getId(),
        h.getAssetId(),
        h.getFromStatus(),
        h.getToStatus(),
        h.getReason(),
        h.getChangedBy(),
        h.getChangedAt()
    );
  }
}

package com.smartbanking.asset.service;

import com.smartbanking.asset.domain.Asset;
import com.smartbanking.asset.domain.AssetAssignment;
import com.smartbanking.asset.domain.AssetStatus;
import com.smartbanking.asset.domain.AssetStatusHistory;
import com.smartbanking.asset.domain.OwnerType;
import com.smartbanking.asset.outbox.OutboxEventService;
import com.smartbanking.asset.repo.AssetAssignmentRepository;
import com.smartbanking.asset.repo.AssetCategoryRepository;
import com.smartbanking.asset.repo.AssetRepository;
import com.smartbanking.asset.repo.AssetStatusHistoryRepository;
import com.smartbanking.asset.web.BadRequestException;
import com.smartbanking.asset.web.ConflictException;
import com.smartbanking.asset.web.NotFoundException;
import com.smartbanking.asset.web.dto.AssignRequest;
import com.smartbanking.asset.web.dto.ChangeStatusRequest;
import com.smartbanking.asset.web.dto.CreateAssetRequest;
import com.smartbanking.asset.web.dto.ReturnRequest;
import com.smartbanking.asset.web.dto.UpdateAssetRequest;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssetService {
  private final AssetRepository assetRepo;
  private final AssetCategoryRepository categoryRepo;
  private final AssetAssignmentRepository assignmentRepo;
  private final AssetStatusHistoryRepository statusHistoryRepo;
  private final OutboxEventService outbox;

  public AssetService(
      AssetRepository assetRepo,
      AssetCategoryRepository categoryRepo,
      AssetAssignmentRepository assignmentRepo,
      AssetStatusHistoryRepository statusHistoryRepo,
      OutboxEventService outbox
  ) {
    this.assetRepo = assetRepo;
    this.categoryRepo = categoryRepo;
    this.assignmentRepo = assignmentRepo;
    this.statusHistoryRepo = statusHistoryRepo;
    this.outbox = outbox;
  }

  public record AssetStatusCount(AssetStatus status, long count) {}

  public record AssetCategoryCount(String categoryCode, long count) {}

  public record AssetSummary(List<AssetStatusCount> byStatus, List<AssetCategoryCount> byCategory) {}

  public record ActiveAssignmentSummary(List<AssetStatusCount> byStatus, List<AssetCategoryCount> byCategory) {}

  public AssetSummary summary() {
    var byStatus = assetRepo.statusSummary().stream()
        .map(r -> new AssetStatusCount(r.getStatus(), r.getCount()))
        .toList();
    var byCategory = assetRepo.categorySummary().stream()
        .map(r -> new AssetCategoryCount(r.getCategoryCode(), r.getCount()))
        .toList();
    return new AssetSummary(byStatus, byCategory);
  }

  public ActiveAssignmentSummary activeAssignmentSummary() {
    var byStatus = assignmentRepo.countActiveByAssetStatus().stream()
        .map(r -> new AssetStatusCount(r.getStatus(), r.getCount()))
        .toList();
    var byCategory = assignmentRepo.countActiveByAssetCategory().stream()
        .map(r -> new AssetCategoryCount(r.getCategoryCode(), r.getCount()))
        .toList();
    return new ActiveAssignmentSummary(byStatus, byCategory);
  }

  @Transactional
  public Asset create(CreateAssetRequest req, String actor, String correlationId) {
    if (!categoryRepo.existsById(req.categoryCode())) {
      throw new BadRequestException("Unknown categoryCode: " + req.categoryCode());
    }
    if (assetRepo.existsBySerialNumber(req.serialNumber())) {
      throw new ConflictException("serialNumber already exists");
    }

    Instant now = Instant.now();
    Asset asset = new Asset(
        UUID.randomUUID(),
        req.name(),
        req.type(),
        req.categoryCode(),
        req.serialNumber(),
        req.description(),
        req.inventoryTag(),
        req.model(),
        req.vendor(),
        req.purchaseDate(),
        req.warrantyUntil(),
        req.cost(),
        AssetStatus.REGISTERED,
        now,
        now
    );
    assetRepo.save(asset);

    statusHistoryRepo.save(new AssetStatusHistory(
        UUID.randomUUID(),
        asset.getId(),
        AssetStatus.REGISTERED,
        AssetStatus.REGISTERED,
        "Asset registered",
        actor,
        Instant.now()
    ));

    outbox.enqueue("AssetCreated", "ASSET", asset.getId(), actor, correlationId, Map.of(
        "assetId", asset.getId().toString(),
        "entityType", "ASSET",
        "entityId", asset.getId().toString(),
        "name", asset.getName(),
        "serialNumber", asset.getSerialNumber(),
        "status", asset.getStatus().name(),
        "categoryCode", asset.getCategoryCode()
    ));
    return asset;
  }

  public Page<Asset> search(Optional<String> q, Optional<String> categoryCode, Optional<AssetStatus> status, Pageable pageable) {
    Specification<Asset> spec = (root, query, cb) -> cb.conjunction();
    spec = spec.and((root, query, cb) -> cb.isNull(root.get("deletedAt")));
    if (q.isPresent()) {
      String like = "%" + q.get().toLowerCase() + "%";
      spec = spec.and((root, query, cb) -> cb.or(
          cb.like(cb.lower(root.get("name")), like),
          cb.like(cb.lower(root.get("type")), like),
          cb.like(cb.lower(root.get("serialNumber")), like),
          cb.like(cb.lower(root.get("inventoryTag")), like)
      ));
    }
    if (categoryCode.isPresent()) {
      spec = spec.and((root, query, cb) -> cb.equal(root.get("categoryCode"), categoryCode.get()));
    }
    if (status.isPresent()) {
      spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status.get()));
    }
    return assetRepo.findAll(spec, pageable);
  }

  public Page<Asset> aging(
      int olderThanDays,
      Optional<String> q,
      Optional<String> categoryCode,
      Optional<AssetStatus> status,
      boolean includeTerminal,
      Pageable pageable
  ) {
    if (olderThanDays < 0) {
      throw new BadRequestException("days must be >= 0");
    }
    LocalDate thresholdDate = LocalDate.now().minusDays(olderThanDays);
    Instant thresholdInstant = Instant.now().minus(olderThanDays, ChronoUnit.DAYS);

    Specification<Asset> spec = (root, query, cb) -> cb.or(
        cb.lessThanOrEqualTo(root.get("purchaseDate"), thresholdDate),
        cb.and(cb.isNull(root.get("purchaseDate")), cb.lessThanOrEqualTo(root.get("createdAt"), thresholdInstant))
    );
    spec = spec.and((root, query, cb) -> cb.isNull(root.get("deletedAt")));
    if (q.isPresent()) {
      String like = "%" + q.get().toLowerCase() + "%";
      spec = spec.and((root, query, cb) -> cb.or(
          cb.like(cb.lower(root.get("name")), like),
          cb.like(cb.lower(root.get("type")), like),
          cb.like(cb.lower(root.get("serialNumber")), like),
          cb.like(cb.lower(root.get("inventoryTag")), like)
      ));
    }
    if (categoryCode.isPresent()) {
      spec = spec.and((root, query, cb) -> cb.equal(root.get("categoryCode"), categoryCode.get()));
    }
    if (status.isPresent()) {
      spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status.get()));
    } else if (!includeTerminal) {
      spec = spec.and((root, query, cb) -> cb.not(root.get("status").in(AssetStatus.LOST, AssetStatus.WRITTEN_OFF)));
    }
    return assetRepo.findAll(spec, pageable);
  }

  public Page<Asset> assignedToOwner(
      OwnerType ownerType,
      UUID ownerId,
      Optional<String> q,
      Optional<String> categoryCode,
      Optional<AssetStatus> status,
      Pageable pageable
  ) {
    if (ownerType == null) {
      throw new BadRequestException("ownerType is required");
    }
    if (ownerId == null) {
      throw new BadRequestException("ownerId is required");
    }

    Specification<Asset> spec = (root, query, cb) -> cb.conjunction();
    spec = spec.and((root, query, cb) -> cb.isNull(root.get("deletedAt")));

    spec = spec.and((root, query, cb) -> {
      Subquery<UUID> sq = query.subquery(UUID.class);
      Root<AssetAssignment> asg = sq.from(AssetAssignment.class);
      sq.select(asg.get("assetId"));
      sq.where(cb.and(
          cb.equal(asg.get("ownerType"), ownerType),
          cb.equal(asg.get("ownerId"), ownerId),
          cb.isNull(asg.get("returnedAt"))
      ));
      return root.get("id").in(sq);
    });

    if (q != null && q.isPresent()) {
      String like = "%" + q.get().toLowerCase() + "%";
      spec = spec.and((root, query, cb) -> cb.or(
          cb.like(cb.lower(root.get("name")), like),
          cb.like(cb.lower(root.get("type")), like),
          cb.like(cb.lower(root.get("serialNumber")), like),
          cb.like(cb.lower(root.get("inventoryTag")), like)
      ));
    }
    if (categoryCode != null && categoryCode.isPresent()) {
      spec = spec.and((root, query, cb) -> cb.equal(root.get("categoryCode"), categoryCode.get()));
    }
    if (status != null && status.isPresent()) {
      spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status.get()));
    }

    return assetRepo.findAll(spec, pageable);
  }

  public record OwnerRef(OwnerType ownerType, UUID ownerId) {}

  public Page<Asset> assignedToAnyOwners(
      List<OwnerRef> owners,
      Optional<String> q,
      Optional<String> categoryCode,
      Optional<AssetStatus> status,
      Pageable pageable
  ) {
    if (owners == null || owners.isEmpty()) {
      throw new BadRequestException("owners are required");
    }

    Map<OwnerType, List<UUID>> idsByType = owners.stream()
        .filter(o -> o != null && o.ownerType() != null && o.ownerId() != null)
        .collect(java.util.stream.Collectors.groupingBy(
            OwnerRef::ownerType,
            java.util.stream.Collectors.mapping(OwnerRef::ownerId, java.util.stream.Collectors.toList())
        ));

    if (idsByType.isEmpty()) {
      throw new BadRequestException("owners are required");
    }

    Specification<Asset> spec = (root, query, cb) -> cb.conjunction();
    spec = spec.and((root, query, cb) -> cb.isNull(root.get("deletedAt")));

    spec = spec.and((root, query, cb) -> {
      Subquery<UUID> sq = query.subquery(UUID.class);
      Root<AssetAssignment> asg = sq.from(AssetAssignment.class);
      sq.select(asg.get("assetId"));

      List<Predicate> ownerPreds = new ArrayList<>();
      idsByType.forEach((type, ids) -> {
        if (type == null || ids == null || ids.isEmpty()) return;
        ownerPreds.add(cb.and(
            cb.equal(asg.get("ownerType"), type),
            asg.get("ownerId").in(ids)
        ));
      });

      if (ownerPreds.isEmpty()) {
        return cb.disjunction();
      }

      sq.where(cb.and(
          cb.isNull(asg.get("returnedAt")),
          cb.or(ownerPreds.toArray(new Predicate[0]))
      ));
      return root.get("id").in(sq);
    });

    if (q != null && q.isPresent()) {
      String like = "%" + q.get().toLowerCase() + "%";
      spec = spec.and((root, query, cb) -> cb.or(
          cb.like(cb.lower(root.get("name")), like),
          cb.like(cb.lower(root.get("type")), like),
          cb.like(cb.lower(root.get("serialNumber")), like),
          cb.like(cb.lower(root.get("inventoryTag")), like)
      ));
    }
    if (categoryCode != null && categoryCode.isPresent()) {
      spec = spec.and((root, query, cb) -> cb.equal(root.get("categoryCode"), categoryCode.get()));
    }
    if (status != null && status.isPresent()) {
      spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status.get()));
    }

    return assetRepo.findAll(spec, pageable);
  }

  public Asset get(UUID id) {
    return assetRepo.findByIdAndDeletedAtIsNull(id).orElseThrow(() -> new NotFoundException("Asset not found"));
  }

  @Transactional
  public Asset assign(UUID assetId, AssignRequest req, String actor, String correlationId) {
    Asset asset = get(assetId);
    if (asset.getStatus().isTerminal()) {
      throw new BadRequestException("Asset is terminal status: " + asset.getStatus());
    }
    if (assignmentRepo.findFirstByAssetIdAndReturnedAtIsNull(assetId).isPresent()) {
      throw new ConflictException("Asset already has an active owner");
    }
    assignmentRepo.save(new AssetAssignment(
        UUID.randomUUID(),
        assetId,
        req.ownerType(),
        req.ownerId(),
        Instant.now(),
        actor,
        req.reason()
    ));

    AssetStatus from = asset.getStatus();
    transitionStatus(asset, AssetStatus.ASSIGNED, "Assigned to " + req.ownerType() + ":" + req.ownerId(), actor);

    Map<String, Object> payload = new HashMap<>();
    payload.put("assetId", assetId.toString());
    payload.put("entityType", "ASSET");
    payload.put("entityId", assetId.toString());
    payload.put("name", asset.getName());
    payload.put("serialNumber", asset.getSerialNumber());
    payload.put("fromStatus", from.name());
    payload.put("toStatus", AssetStatus.ASSIGNED.name());
    payload.put("ownerType", req.ownerType().name());
    payload.put("ownerId", req.ownerId().toString());
    payload.put("assignReason", req.reason());
    outbox.enqueue("AssetAssigned", "ASSET", assetId, actor, correlationId, payload);
    return asset;
  }

  @Transactional
  public Asset returnAsset(UUID assetId, ReturnRequest req, String actor, String correlationId) {
    Asset asset = get(assetId);
    AssetAssignment active = assignmentRepo.findFirstByAssetIdAndReturnedAtIsNull(assetId)
        .orElseThrow(() -> new BadRequestException("Asset has no active assignment"));
    active.markReturned(actor, req.reason());
    assignmentRepo.save(active);

    AssetStatus next = req.nextStatus() == null ? AssetStatus.REGISTERED : req.nextStatus();
    if (next == AssetStatus.ASSIGNED) {
      throw new BadRequestException("nextStatus cannot be ASSIGNED on return");
    }
    AssetStatus from = asset.getStatus();
    transitionStatus(asset, next, "Returned. " + req.reason(), actor);

    Map<String, Object> payload = new HashMap<>();
    payload.put("assetId", assetId.toString());
    payload.put("entityType", "ASSET");
    payload.put("entityId", assetId.toString());
    payload.put("name", asset.getName());
    payload.put("serialNumber", asset.getSerialNumber());
    payload.put("fromStatus", from.name());
    payload.put("toStatus", next.name());
    payload.put("reason", req.reason());
    outbox.enqueue("AssetUnassigned", "ASSET", assetId, actor, correlationId, payload);
    return asset;
  }

  @Transactional
  public Asset changeStatus(UUID assetId, ChangeStatusRequest req, String actor, String correlationId) {
    Asset asset = get(assetId);
    AssetStatus from = asset.getStatus();

    if (from.isTerminal()) {
      throw new BadRequestException("Cannot change status from terminal: " + from);
    }
    if (req.toStatus() == AssetStatus.ASSIGNED) {
      throw new BadRequestException("Use /assign endpoint to set ASSIGNED");
    }
    if (req.toStatus().isTerminal() && from == AssetStatus.ASSIGNED) {
      assignmentRepo.findFirstByAssetIdAndReturnedAtIsNull(assetId)
          .ifPresent(a -> {
            a.markReturned(actor, "Auto-return due to status change to " + req.toStatus());
            assignmentRepo.save(a);
          });
    }

    transitionStatus(asset, req.toStatus(), req.reason(), actor);

    Map<String, Object> payload = new HashMap<>();
    payload.put("assetId", assetId.toString());
    payload.put("entityType", "ASSET");
    payload.put("entityId", assetId.toString());
    payload.put("name", asset.getName());
    payload.put("serialNumber", asset.getSerialNumber());
    payload.put("fromStatus", from.name());
    payload.put("toStatus", req.toStatus().name());
    payload.put("reason", req.reason());
    outbox.enqueue("AssetStatusChanged", "ASSET", assetId, actor, correlationId, payload);
    return asset;
  }

  @Transactional
  public Asset update(UUID assetId, UpdateAssetRequest req, String actor, String correlationId) {
    Asset asset = get(assetId);
    if (!categoryRepo.existsById(req.categoryCode())) {
      throw new BadRequestException("Unknown categoryCode: " + req.categoryCode());
    }
    if (!asset.getSerialNumber().equals(req.serialNumber()) && assetRepo.existsBySerialNumber(req.serialNumber())) {
      throw new ConflictException("serialNumber already exists");
    }
    asset.setName(req.name());
    asset.setType(req.type());
    asset.setCategoryCode(req.categoryCode());
    asset.setSerialNumber(req.serialNumber());
    asset.setDescription(req.description());
    asset.setInventoryTag(req.inventoryTag());
    asset.setModel(req.model());
    asset.setVendor(req.vendor());
    asset.setPurchaseDate(req.purchaseDate());
    asset.setWarrantyUntil(req.warrantyUntil());
    asset.setCost(req.cost());
    asset.touchUpdatedAt();
    assetRepo.save(asset);

    outbox.enqueue("AssetUpdated", "ASSET", assetId, actor, correlationId, Map.of(
        "assetId", assetId.toString(),
        "entityType", "ASSET",
        "entityId", assetId.toString(),
        "serialNumber", asset.getSerialNumber(),
        "name", asset.getName(),
        "type", asset.getType(),
        "categoryCode", asset.getCategoryCode(),
        "status", asset.getStatus().name()
    ));
    return asset;
  }

  public Optional<AssetAssignment> currentAssignment(UUID assetId) {
    get(assetId);
    return assignmentRepo.findFirstByAssetIdAndReturnedAtIsNull(assetId);
  }

  public List<AssetAssignment> currentAssignments(List<UUID> assetIds) {
    if (assetIds == null || assetIds.isEmpty()) {
      return List.of();
    }
    return assignmentRepo.findAllByAssetIdInAndReturnedAtIsNull(assetIds);
  }

  public List<AssetAssignment> assignmentHistory(UUID assetId) {
    get(assetId);
    return assignmentRepo.findAllByAssetIdOrderByAssignedAtDesc(assetId);
  }

  public record ActiveOwnerSummary(OwnerType ownerType, UUID ownerId, long count) {}

  public List<ActiveOwnerSummary> activeOwnerSummary() {
    return assignmentRepo.countActiveByOwner()
        .stream()
        .map(c -> new ActiveOwnerSummary(c.getOwnerType(), c.getOwnerId(), c.getCount()))
        .toList();
  }

  public List<ActiveOwnerSummary> activeAgingOwnerSummary(int olderThanDays) {
    if (olderThanDays < 0) {
      throw new BadRequestException("days must be >= 0");
    }
    LocalDate thresholdDate = LocalDate.now().minusDays(olderThanDays);
    Instant thresholdInstant = Instant.now().minus(olderThanDays, ChronoUnit.DAYS);
    return assignmentRepo.countActiveAgingByOwner(thresholdDate, thresholdInstant)
        .stream()
        .map(c -> new ActiveOwnerSummary(c.getOwnerType(), c.getOwnerId(), c.getCount()))
        .toList();
  }

  public record AvailableSummary(String categoryCode, String type, long count) {}

  public List<AvailableSummary> availableSummary(AssetStatus status) {
    return assetRepo.availableSummary(status).stream()
        .map(r -> new AvailableSummary(r.getCategoryCode(), r.getType(), r.getCount()))
        .toList();
  }

  @Transactional
  public void delete(UUID assetId, String reason, String actor, String correlationId) {
    Asset asset = get(assetId);
    String r = (reason == null || reason.isBlank()) ? "Deleted" : reason;

    assignmentRepo.findFirstByAssetIdAndReturnedAtIsNull(assetId)
        .ifPresent(a -> {
          a.markReturned(actor, "Asset deleted. " + r);
          assignmentRepo.save(a);
        });

    asset.markDeleted(actor, r);
    assetRepo.save(asset);

    outbox.enqueue("AssetDeleted", "ASSET", assetId, actor, correlationId, Map.of(
        "assetId", assetId.toString(),
        "entityType", "ASSET",
        "entityId", assetId.toString(),
        "name", asset.getName(),
        "serialNumber", asset.getSerialNumber(),
        "status", asset.getStatus().name(),
        "categoryCode", asset.getCategoryCode(),
        "reason", r
    ));
  }

  public List<AssetStatusHistory> statusHistory(UUID assetId) {
    get(assetId);
    return statusHistoryRepo.findAllByAssetIdOrderByChangedAtDesc(assetId);
  }

  private void transitionStatus(Asset asset, AssetStatus to, String reason, String actor) {
    AssetStatus from = asset.getStatus();
    if (from == to) {
      return;
    }
    if (from.isTerminal()) {
      throw new BadRequestException("Cannot transition from terminal status: " + from);
    }
    asset.setStatus(to);
    asset.touchUpdatedAt();
    assetRepo.save(asset);

    statusHistoryRepo.save(new AssetStatusHistory(
        UUID.randomUUID(),
        asset.getId(),
        from,
        to,
        reason,
        actor,
        Instant.now()
    ));
  }


}

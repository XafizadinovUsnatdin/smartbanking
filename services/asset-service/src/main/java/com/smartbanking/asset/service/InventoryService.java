package com.smartbanking.asset.service;

import com.smartbanking.asset.domain.Asset;
import com.smartbanking.asset.domain.AssetAssignment;
import com.smartbanking.asset.domain.InventoryScan;
import com.smartbanking.asset.domain.InventorySession;
import com.smartbanking.asset.domain.InventorySessionStatus;
import com.smartbanking.asset.domain.OwnerType;
import com.smartbanking.asset.outbox.OutboxEventService;
import com.smartbanking.asset.repo.AssetAssignmentRepository;
import com.smartbanking.asset.repo.AssetRepository;
import com.smartbanking.asset.repo.InventoryScanRepository;
import com.smartbanking.asset.repo.InventorySessionRepository;
import com.smartbanking.asset.web.BadRequestException;
import com.smartbanking.asset.web.NotFoundException;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryService {
  private final InventorySessionRepository sessionRepo;
  private final InventoryScanRepository scanRepo;
  private final AssetAssignmentRepository assignmentRepo;
  private final AssetRepository assetRepo;
  private final OutboxEventService outbox;

  public InventoryService(InventorySessionRepository sessionRepo,
                          InventoryScanRepository scanRepo,
                          AssetAssignmentRepository assignmentRepo,
                          AssetRepository assetRepo,
                          OutboxEventService outbox) {
    this.sessionRepo = sessionRepo;
    this.scanRepo = scanRepo;
    this.assignmentRepo = assignmentRepo;
    this.assetRepo = assetRepo;
    this.outbox = outbox;
  }

  @Transactional
  public InventorySession create(String name, OwnerType ownerType, UUID ownerId, String actor, String correlationId) {
    if (name == null || name.isBlank()) {
      throw new BadRequestException("name is required");
    }
    if (ownerType == null) {
      throw new BadRequestException("ownerType is required");
    }
    if (ownerId == null) {
      throw new BadRequestException("ownerId is required");
    }

    Instant now = Instant.now();
    InventorySession session = new InventorySession(UUID.randomUUID(), name, ownerType, ownerId, InventorySessionStatus.OPEN, now, actor);

    Set<UUID> expected = assignmentRepo.findAllByOwnerTypeAndOwnerIdAndReturnedAtIsNull(ownerType, ownerId)
        .stream()
        .map(AssetAssignment::getAssetId)
        .collect(java.util.stream.Collectors.toSet());
    session.setExpectedAssetIds(expected);

    sessionRepo.save(session);

    outbox.enqueue("InventorySessionCreated", "INVENTORY", session.getId(), actor, correlationId, Map.of(
        "entityType", "INVENTORY",
        "entityId", session.getId().toString(),
        "ownerType", ownerType.name(),
        "ownerId", ownerId.toString(),
        "expectedCount", expected.size()
    ));
    return session;
  }

  public List<InventorySession> list() {
    return sessionRepo.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
  }

  public InventorySession get(UUID id) {
    return sessionRepo.findById(id).orElseThrow(() -> new NotFoundException("Inventory session not found"));
  }

  @Transactional
  public InventoryScan scan(UUID sessionId, UUID assetId, String note, String actor, String correlationId) {
    InventorySession session = get(sessionId);
    if (session.getStatus() != InventorySessionStatus.OPEN) {
      throw new BadRequestException("Inventory session is not OPEN");
    }
    if (!assetRepo.existsById(assetId)) {
      throw new NotFoundException("Asset not found");
    }
    var existing = scanRepo.findFirstBySessionIdAndAssetId(sessionId, assetId);
    if (existing.isPresent()) {
      return existing.get();
    }

    InventoryScan scan = new InventoryScan(UUID.randomUUID(), sessionId, assetId, Instant.now(), actor, note);
    scanRepo.save(scan);

    outbox.enqueue("InventoryAssetScanned", "INVENTORY", sessionId, actor, correlationId, Map.of(
        "entityType", "INVENTORY",
        "entityId", sessionId.toString(),
        "assetId", assetId.toString(),
        "note", note == null ? "" : note
    ));
    return scan;
  }

  @Transactional
  public InventorySession close(UUID sessionId, String actor, String correlationId) {
    InventorySession session = get(sessionId);
    session.close(actor);
    sessionRepo.save(session);

    outbox.enqueue("InventorySessionClosed", "INVENTORY", sessionId, actor, correlationId, Map.of(
        "entityType", "INVENTORY",
        "entityId", sessionId.toString()
    ));
    return session;
  }

  @Transactional(readOnly = true)
  public InventoryReport report(UUID sessionId) {
    InventorySession session = get(sessionId);
    Set<UUID> expected = session.getExpectedAssetIds() == null ? Set.of() : session.getExpectedAssetIds();
    Set<UUID> scanned = scanRepo.findAllBySessionIdOrderByScannedAtDesc(sessionId)
        .stream()
        .map(InventoryScan::getAssetId)
        .collect(java.util.stream.Collectors.toSet());

    Set<UUID> missingIds = new HashSet<>(expected);
    missingIds.removeAll(scanned);

    Set<UUID> unexpectedIds = new HashSet<>(scanned);
    unexpectedIds.removeAll(expected);

    List<Asset> missingAssets = missingIds.isEmpty() ? List.of() : assetRepo.findAllById(missingIds);
    List<Asset> unexpectedAssets = unexpectedIds.isEmpty() ? List.of() : assetRepo.findAllById(unexpectedIds);

    return new InventoryReport(session, scanned.size(), missingAssets, unexpectedAssets);
  }

  public record InventoryReport(InventorySession session, long scannedCount, List<Asset> missing, List<Asset> unexpected) {}
}


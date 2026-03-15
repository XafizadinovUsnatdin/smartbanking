package com.smartbanking.asset.service;

import com.smartbanking.asset.domain.AssetRequest;
import com.smartbanking.asset.domain.AssetRequestItem;
import com.smartbanking.asset.domain.AssetRequestStatus;
import com.smartbanking.asset.outbox.OutboxEventService;
import com.smartbanking.asset.repo.AssetCategoryRepository;
import com.smartbanking.asset.repo.AssetRequestItemRepository;
import com.smartbanking.asset.repo.AssetRequestRepository;
import com.smartbanking.asset.web.BadRequestException;
import com.smartbanking.asset.web.NotFoundException;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssetRequestService {
  private final AssetRequestRepository requestRepo;
  private final AssetRequestItemRepository itemRepo;
  private final AssetCategoryRepository categoryRepo;
  private final OutboxEventService outbox;

  public AssetRequestService(AssetRequestRepository requestRepo,
                             AssetRequestItemRepository itemRepo,
                             AssetCategoryRepository categoryRepo,
                             OutboxEventService outbox) {
    this.requestRepo = requestRepo;
    this.itemRepo = itemRepo;
    this.categoryRepo = categoryRepo;
    this.outbox = outbox;
  }

  public record CreateItem(String type, String categoryCode, int quantity) {}
  public record CreateRequest(String note, List<CreateItem> items) {}

  public record ItemView(UUID id, String type, String categoryCode, int quantity) {}

  public record RequestView(
      UUID id,
      UUID requesterId,
      String requesterUsername,
      AssetRequestStatus status,
      String note,
      Instant createdAt,
      Instant updatedAt,
      Instant decidedAt,
      String decidedBy,
      String decisionNote,
      List<ItemView> items
  ) {}

  public record DemandSummary(String categoryCode, String type, long quantity) {}

  @Transactional
  public RequestView create(CreateRequest req, String principal, String actor, String correlationId) {
    if (req == null || req.items() == null || req.items().isEmpty()) {
      throw new BadRequestException("items are required");
    }

    Principal p = parsePrincipal(principal);
    String note = normalizeNote(req.note());

    Instant now = Instant.now();
    UUID requestId = UUID.randomUUID();
    AssetRequest r = new AssetRequest(
        requestId,
        p.userId(),
        p.username(),
        AssetRequestStatus.SUBMITTED,
        note,
        now,
        now
    );
    requestRepo.save(r);

    List<AssetRequestItem> items = req.items().stream()
        .map(i -> toItem(requestId, i))
        .toList();
    itemRepo.saveAll(items);

    outbox.enqueue("AssetRequestCreated", "ASSET_REQUEST", requestId, actor, correlationId, Map.of(
        "entityType", "ASSET_REQUEST",
        "entityId", requestId.toString(),
        "requestId", requestId.toString(),
        "requesterId", p.userId().toString(),
        "requesterUsername", p.username(),
        "status", r.getStatus().name(),
        "items", items.stream()
            .map(it -> Map.of(
                "type", it.getAssetType(),
                "categoryCode", it.getCategoryCode(),
                "quantity", it.getQuantity()
            ))
            .toList()
    ));

    return toView(r, items);
  }

  public List<RequestView> list(Optional<AssetRequestStatus> status) {
    List<AssetRequest> requests = status
        .map(requestRepo::findAllByStatusOrderByCreatedAtDesc)
        .orElseGet(requestRepo::findAllLatest);
    return toViews(requests);
  }

  public List<RequestView> listMy(UUID requesterId) {
    return toViews(requestRepo.findAllByRequesterIdOrderByCreatedAtDesc(requesterId));
  }

  public RequestView get(UUID requestId) {
    AssetRequest r = requestRepo.findById(requestId).orElseThrow(() -> new NotFoundException("Request not found"));
    List<AssetRequestItem> items = itemRepo.findAllByRequestId(requestId);
    return toView(r, items);
  }

  @Transactional
  public RequestView updateStatus(UUID requestId, AssetRequestStatus status, String note, String actor, String correlationId) {
    AssetRequest r = requestRepo.findById(requestId).orElseThrow(() -> new NotFoundException("Request not found"));
    if (status == null) {
      throw new BadRequestException("status is required");
    }
    if (r.getStatus().isTerminal()) {
      throw new BadRequestException("Request already terminal: " + r.getStatus());
    }
    r.decide(status, actor, normalizeNote(note));
    requestRepo.save(r);

    outbox.enqueue("AssetRequestStatusChanged", "ASSET_REQUEST", requestId, actor, correlationId, Map.of(
        "entityType", "ASSET_REQUEST",
        "entityId", requestId.toString(),
        "requestId", requestId.toString(),
        "status", r.getStatus().name()
    ));

    return get(requestId);
  }

  @Transactional
  public RequestView cancel(UUID requestId, UUID requesterId, String note, String actor, String correlationId) {
    AssetRequest r = requestRepo.findById(requestId).orElseThrow(() -> new NotFoundException("Request not found"));
    if (!r.getRequesterId().equals(requesterId)) {
      throw new BadRequestException("Only requester can cancel");
    }
    if (r.getStatus().isTerminal()) {
      throw new BadRequestException("Request already terminal: " + r.getStatus());
    }
    r.decide(AssetRequestStatus.CANCELLED, actor, normalizeNote(note));
    requestRepo.save(r);

    outbox.enqueue("AssetRequestCancelled", "ASSET_REQUEST", requestId, actor, correlationId, Map.of(
        "entityType", "ASSET_REQUEST",
        "entityId", requestId.toString(),
        "requestId", requestId.toString(),
        "status", r.getStatus().name()
    ));
    return get(requestId);
  }

  public List<DemandSummary> demandSummary(List<AssetRequestStatus> statuses) {
    List<String> s = (statuses == null || statuses.isEmpty())
        ? List.of(AssetRequestStatus.SUBMITTED.name(), AssetRequestStatus.APPROVED.name())
        : statuses.stream().map(Enum::name).toList();
    return requestRepo.demandSummary(s).stream()
        .map(r -> new DemandSummary(r.getCategoryCode(), r.getAssetType(), r.getQuantity()))
        .toList();
  }

  private List<RequestView> toViews(List<AssetRequest> requests) {
    if (requests == null || requests.isEmpty()) {
      return List.of();
    }
    List<UUID> ids = requests.stream().map(AssetRequest::getId).toList();
    Map<UUID, List<AssetRequestItem>> itemsByRequest = itemRepo.findAllByRequestIdIn(ids).stream()
        .collect(Collectors.groupingBy(AssetRequestItem::getRequestId));
    return requests.stream()
        .map(r -> toView(r, itemsByRequest.getOrDefault(r.getId(), List.of())))
        .toList();
  }

  private RequestView toView(AssetRequest r, List<AssetRequestItem> items) {
    List<ItemView> views = (items == null ? List.<AssetRequestItem>of() : items).stream()
        .sorted(Comparator.comparing(AssetRequestItem::getCategoryCode).thenComparing(AssetRequestItem::getAssetType))
        .map(i -> new ItemView(i.getId(), i.getAssetType(), i.getCategoryCode(), i.getQuantity()))
        .toList();
    return new RequestView(
        r.getId(),
        r.getRequesterId(),
        r.getRequesterUsername(),
        r.getStatus(),
        r.getNote(),
        r.getCreatedAt(),
        r.getUpdatedAt(),
        r.getDecidedAt(),
        r.getDecidedBy(),
        r.getDecisionNote(),
        views
    );
  }

  private AssetRequestItem toItem(UUID requestId, CreateItem req) {
    if (req == null) {
      throw new BadRequestException("item is required");
    }
    String type = req.type() == null ? "" : req.type().trim();
    if (type.isBlank()) {
      throw new BadRequestException("item.type is required");
    }
    String category = req.categoryCode() == null ? "" : req.categoryCode().trim();
    if (category.isBlank()) {
      throw new BadRequestException("item.categoryCode is required");
    }
    if (!categoryRepo.existsById(category)) {
      throw new BadRequestException("Unknown categoryCode: " + category);
    }
    if (req.quantity() <= 0) {
      throw new BadRequestException("item.quantity must be > 0");
    }
    String normalizedType = type.toUpperCase();
    return new AssetRequestItem(UUID.randomUUID(), requestId, normalizedType, category, req.quantity());
  }

  private static String normalizeNote(String note) {
    if (note == null) return null;
    String trimmed = note.trim();
    if (trimmed.isBlank()) return null;
    return trimmed.length() > 1000 ? trimmed.substring(0, 1000) : trimmed;
  }

  private record Principal(UUID userId, String username) {}

  private Principal parsePrincipal(String principal) {
    if (principal == null || principal.isBlank()) {
      throw new BadRequestException("Missing principal");
    }
    String raw = principal.trim();
    String[] parts = raw.split(":", 2);
    String userId = parts[0];
    String username = parts.length > 1 && !parts[1].isBlank() ? parts[1] : userId;
    try {
      return new Principal(UUID.fromString(userId), username);
    } catch (IllegalArgumentException e) {
      throw new BadRequestException("Invalid principal format");
    }
  }
}

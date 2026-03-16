package com.smartbanking.asset.web;

import com.smartbanking.asset.domain.AssetRequestStatus;
import com.smartbanking.asset.service.AssetRequestService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/asset-requests")
public class AssetRequestController {
  private static final Set<String> MANAGER_ROLES = Set.of("ROLE_ADMIN", "ROLE_IT_ADMIN", "ROLE_ASSET_MANAGER", "ROLE_AUDITOR");

  private final AssetRequestService requestService;

  public AssetRequestController(AssetRequestService requestService) {
    this.requestService = requestService;
  }

  public record CreateItem(
      @NotBlank @Size(max = 120) String type,
      @NotBlank @Size(max = 50) String categoryCode,
      @Min(1) int quantity
  ) {}

  public record CreateRequest(
      @Size(max = 1000) String note,
      @NotEmpty List<@Valid CreateItem> items
  ) {}

  @PostMapping
  @PreAuthorize("hasAnyRole('EMPLOYEE','ADMIN','IT_ADMIN','ASSET_MANAGER')")
  @ResponseStatus(HttpStatus.CREATED)
  public AssetRequestService.RequestView create(@Valid @RequestBody CreateRequest req, Authentication auth) {
    var items = req.items().stream()
        .map(i -> new AssetRequestService.CreateItem(i.type(), i.categoryCode(), i.quantity()))
        .toList();
    return requestService.create(
        new AssetRequestService.CreateRequest(req.note(), items),
        principal(auth),
        actor(auth),
        null
    );
  }

  @GetMapping("/me")
  @PreAuthorize("isAuthenticated()")
  public List<AssetRequestService.RequestView> my(Authentication auth) {
    return requestService.listMy(userId(auth));
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER','AUDITOR')")
  public List<AssetRequestService.RequestView> list(@RequestParam Optional<AssetRequestStatus> status) {
    return requestService.list(status);
  }

  @GetMapping("/demand-summary")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER','AUDITOR')")
  public List<AssetRequestService.DemandSummary> demandSummary() {
    return requestService.demandSummary(List.of(AssetRequestStatus.SUBMITTED, AssetRequestStatus.APPROVED));
  }

  @GetMapping("/{id}")
  @PreAuthorize("isAuthenticated()")
  public AssetRequestService.RequestView get(@PathVariable UUID id, Authentication auth) {
    var view = requestService.get(id);
    if (isManager(auth) || view.requesterId().equals(userId(auth))) {
      return view;
    }
    throw new BadRequestException("Access denied");
  }

  public record UpdateStatusRequest(
      @NotNull AssetRequestStatus status,
      @Size(max = 1000) String note
  ) {}

  @PutMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER')")
  public AssetRequestService.RequestView updateStatus(@PathVariable UUID id, @Valid @RequestBody UpdateStatusRequest req, Authentication auth) {
    return requestService.updateStatus(id, req.status(), req.note(), actor(auth), null);
  }

  public record FulfillResponse(
      AssetRequestService.RequestView request,
      List<UUID> assignedAssetIds,
      List<AssetRequestService.MissingItem> missing
  ) {}

  @PostMapping("/{id}/fulfill")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER')")
  public FulfillResponse fulfill(@PathVariable UUID id, Authentication auth) {
    var res = requestService.fulfill(id, actor(auth), null);
    return new FulfillResponse(res.request(), res.assignedAssetIds(), res.missing());
  }

  public record CancelRequest(@Size(max = 1000) String note) {}

  @PutMapping("/{id}/cancel")
  @PreAuthorize("isAuthenticated()")
  public AssetRequestService.RequestView cancel(@PathVariable UUID id, @Valid @RequestBody(required = false) CancelRequest req, Authentication auth) {
    return requestService.cancel(id, userId(auth), req == null ? null : req.note(), actor(auth), null);
  }

  private static boolean isManager(Authentication auth) {
    if (auth == null) return false;
    for (GrantedAuthority a : auth.getAuthorities()) {
      if (MANAGER_ROLES.contains(a.getAuthority())) return true;
    }
    return false;
  }

  private static String actor(Authentication auth) {
    return auth == null ? "anonymous" : String.valueOf(auth.getPrincipal());
  }

  private static String principal(Authentication auth) {
    return auth == null ? "" : String.valueOf(auth.getPrincipal());
  }

  private static UUID userId(Authentication auth) {
    String principal = principal(auth);
    String[] parts = principal.split(":", 2);
    try {
      return UUID.fromString(parts[0]);
    } catch (Exception e) {
      throw new BadRequestException("Invalid user");
    }
  }
}

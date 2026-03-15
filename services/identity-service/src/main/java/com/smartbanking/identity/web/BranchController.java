package com.smartbanking.identity.web;

import com.smartbanking.identity.domain.Branch;
import com.smartbanking.identity.repo.BranchRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/branches")
public class BranchController {
  private final BranchRepository repo;

  public BranchController(BranchRepository repo) {
    this.repo = repo;
  }

  public record BranchResponse(UUID id, String name, String address, Instant createdAt) {}

  public record BranchPublicResponse(UUID id, String name) {}

  public record UpsertBranchRequest(
      @NotBlank @Size(max = 200) String name,
      @Size(max = 400) String address
  ) {}

  @GetMapping
  @PreAuthorize("isAuthenticated()")
  public List<BranchResponse> list() {
    return repo.findAll().stream().map(BranchController::toResponse).toList();
  }

  @GetMapping("/{id}")
  @PreAuthorize("isAuthenticated()")
  public BranchResponse get(@PathVariable UUID id) {
    Branch b = repo.findById(id).orElseThrow(() -> new NotFoundException("Branch not found"));
    return toResponse(b);
  }

  @GetMapping("/{id}/public")
  @PreAuthorize("isAuthenticated()")
  public BranchPublicResponse getPublic(@PathVariable UUID id) {
    Branch b = repo.findById(id).orElseThrow(() -> new NotFoundException("Branch not found"));
    return new BranchPublicResponse(b.getId(), b.getName());
  }

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  @ResponseStatus(HttpStatus.CREATED)
  public BranchResponse create(@Valid @RequestBody UpsertBranchRequest req) {
    Branch b = new Branch(UUID.randomUUID(), req.name(), req.address(), Instant.now());
    repo.save(b);
    return toResponse(b);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public BranchResponse update(@PathVariable UUID id, @Valid @RequestBody UpsertBranchRequest req) {
    Branch b = repo.findById(id).orElseThrow(() -> new NotFoundException("Branch not found"));
    b.setName(req.name());
    b.setAddress(req.address());
    repo.save(b);
    return toResponse(b);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    if (!repo.existsById(id)) {
      throw new NotFoundException("Branch not found");
    }
    repo.deleteById(id);
  }

  private static BranchResponse toResponse(Branch b) {
    return new BranchResponse(b.getId(), b.getName(), b.getAddress(), b.getCreatedAt());
  }
}


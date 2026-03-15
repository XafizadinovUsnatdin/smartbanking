package com.smartbanking.identity.web;

import com.smartbanking.identity.domain.Department;
import com.smartbanking.identity.repo.DepartmentRepository;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/departments")
public class DepartmentController {
  private final DepartmentRepository repo;

  public DepartmentController(DepartmentRepository repo) {
    this.repo = repo;
  }

  public record DepartmentResponse(UUID id, String name, UUID branchId, Instant createdAt) {}

  public record DepartmentPublicResponse(UUID id, String name) {}

  public record UpsertDepartmentRequest(
      @NotBlank @Size(max = 200) String name,
      UUID branchId
  ) {}

  @GetMapping
  @PreAuthorize("isAuthenticated()")
  public List<DepartmentResponse> list(@RequestParam(required = false) UUID branchId) {
    var list = branchId == null ? repo.findAll() : repo.findAllByBranchId(branchId);
    return list.stream().map(DepartmentController::toResponse).toList();
  }

  @GetMapping("/{id}")
  @PreAuthorize("isAuthenticated()")
  public DepartmentResponse get(@PathVariable UUID id) {
    Department d = repo.findById(id).orElseThrow(() -> new NotFoundException("Department not found"));
    return toResponse(d);
  }

  @GetMapping("/{id}/public")
  @PreAuthorize("isAuthenticated()")
  public DepartmentPublicResponse getPublic(@PathVariable UUID id) {
    Department d = repo.findById(id).orElseThrow(() -> new NotFoundException("Department not found"));
    return new DepartmentPublicResponse(d.getId(), d.getName());
  }

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  @ResponseStatus(HttpStatus.CREATED)
  public DepartmentResponse create(@Valid @RequestBody UpsertDepartmentRequest req) {
    Department d = new Department(UUID.randomUUID(), req.name(), req.branchId(), Instant.now());
    repo.save(d);
    return toResponse(d);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public DepartmentResponse update(@PathVariable UUID id, @Valid @RequestBody UpsertDepartmentRequest req) {
    Department d = repo.findById(id).orElseThrow(() -> new NotFoundException("Department not found"));
    d.setName(req.name());
    d.setBranchId(req.branchId());
    repo.save(d);
    return toResponse(d);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    if (!repo.existsById(id)) {
      throw new NotFoundException("Department not found");
    }
    repo.deleteById(id);
  }

  private static DepartmentResponse toResponse(Department d) {
    return new DepartmentResponse(d.getId(), d.getName(), d.getBranchId(), d.getCreatedAt());
  }
}


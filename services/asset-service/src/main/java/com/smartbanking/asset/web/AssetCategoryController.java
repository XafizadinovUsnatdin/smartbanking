package com.smartbanking.asset.web;

import com.smartbanking.asset.domain.AssetCategory;
import com.smartbanking.asset.repo.AssetCategoryRepository;
import com.smartbanking.asset.repo.AssetRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.data.domain.Sort;
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
@RequestMapping("/asset-categories")
public class AssetCategoryController {
  private final AssetCategoryRepository repo;
  private final AssetRepository assetRepo;

  public AssetCategoryController(AssetCategoryRepository repo, AssetRepository assetRepo) {
    this.repo = repo;
    this.assetRepo = assetRepo;
  }

  public record CategoryResponse(String code, String name) {}

  @GetMapping
  public List<CategoryResponse> list() {
    return repo.findAll(Sort.by(Sort.Direction.ASC, "code"))
        .stream()
        .map(c -> new CategoryResponse(c.getCode(), c.getName()))
        .toList();
  }

  public record CreateCategoryRequest(
      @NotBlank @Size(max = 50) String code,
      @NotBlank @Size(max = 120) String name
  ) {}

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER')")
  @ResponseStatus(HttpStatus.CREATED)
  public CategoryResponse create(@Valid @RequestBody CreateCategoryRequest req) {
    if (repo.existsById(req.code())) {
      throw new ConflictException("Category already exists: " + req.code());
    }
    AssetCategory saved = repo.save(new AssetCategory(req.code(), req.name()));
    return new CategoryResponse(saved.getCode(), saved.getName());
  }

  public record UpdateCategoryRequest(@NotBlank @Size(max = 120) String name) {}

  @PutMapping("/{code}")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER')")
  public CategoryResponse update(@PathVariable String code, @Valid @RequestBody UpdateCategoryRequest req) {
    AssetCategory category = repo.findById(code).orElseThrow(() -> new NotFoundException("Category not found"));
    AssetCategory saved = repo.save(new AssetCategory(category.getCode(), req.name()));
    return new CategoryResponse(saved.getCode(), saved.getName());
  }

  @DeleteMapping("/{code}")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable String code) {
    if (!repo.existsById(code)) {
      throw new NotFoundException("Category not found");
    }
    if (assetRepo.existsByCategoryCodeAndDeletedAtIsNull(code)) {
      throw new ConflictException("Category is in use by assets");
    }
    repo.deleteById(code);
  }
}

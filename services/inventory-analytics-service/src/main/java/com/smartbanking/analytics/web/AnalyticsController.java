package com.smartbanking.analytics.web;

import com.smartbanking.analytics.repo.AssetCategoryCountRepository;
import com.smartbanking.analytics.repo.AssetStatusCountRepository;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AnalyticsController {
  private final AssetStatusCountRepository statusRepo;
  private final AssetCategoryCountRepository categoryRepo;

  public AnalyticsController(AssetStatusCountRepository statusRepo, AssetCategoryCountRepository categoryRepo) {
    this.statusRepo = statusRepo;
    this.categoryRepo = categoryRepo;
  }

  @GetMapping("/analytics/dashboard")
  public Map<String, Object> dashboard() {
    return Map.of(
        "byStatus", statusRepo.findAll(),
        "byCategory", categoryRepo.findAll()
    );
  }
}


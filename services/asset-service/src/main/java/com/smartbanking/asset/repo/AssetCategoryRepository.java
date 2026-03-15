package com.smartbanking.asset.repo;

import com.smartbanking.asset.domain.AssetCategory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetCategoryRepository extends JpaRepository<AssetCategory, String> {}


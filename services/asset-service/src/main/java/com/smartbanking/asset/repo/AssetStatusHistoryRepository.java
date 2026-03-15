package com.smartbanking.asset.repo;

import com.smartbanking.asset.domain.AssetStatusHistory;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetStatusHistoryRepository extends JpaRepository<AssetStatusHistory, UUID> {
  List<AssetStatusHistory> findAllByAssetIdOrderByChangedAtDesc(UUID assetId);
}

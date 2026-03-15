package com.smartbanking.asset.repo;

import com.smartbanking.asset.domain.AssetRequestItem;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetRequestItemRepository extends JpaRepository<AssetRequestItem, UUID> {
  List<AssetRequestItem> findAllByRequestId(UUID requestId);
  List<AssetRequestItem> findAllByRequestIdIn(List<UUID> requestIds);
}

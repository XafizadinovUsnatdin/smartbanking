package com.smartbanking.asset.repo;

import com.smartbanking.asset.domain.InventoryScan;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryScanRepository extends JpaRepository<InventoryScan, UUID> {
  boolean existsBySessionIdAndAssetId(UUID sessionId, UUID assetId);
  Optional<InventoryScan> findFirstBySessionIdAndAssetId(UUID sessionId, UUID assetId);
  long countBySessionId(UUID sessionId);
  List<InventoryScan> findAllBySessionIdOrderByScannedAtDesc(UUID sessionId);
}

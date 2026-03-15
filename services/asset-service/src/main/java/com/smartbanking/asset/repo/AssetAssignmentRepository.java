package com.smartbanking.asset.repo;

import com.smartbanking.asset.domain.AssetAssignment;
import com.smartbanking.asset.domain.OwnerType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AssetAssignmentRepository extends JpaRepository<AssetAssignment, UUID> {
  interface ActiveOwnerCount {
    OwnerType getOwnerType();
    UUID getOwnerId();
    long getCount();
  }

  Optional<AssetAssignment> findFirstByAssetIdAndReturnedAtIsNull(UUID assetId);
  List<AssetAssignment> findAllByAssetIdOrderByAssignedAtDesc(UUID assetId);
  List<AssetAssignment> findAllByAssetIdInAndReturnedAtIsNull(List<UUID> assetIds);
  List<AssetAssignment> findAllByOwnerTypeAndOwnerIdAndReturnedAtIsNull(OwnerType ownerType, UUID ownerId);

  @Query("""
      select a.ownerType as ownerType, a.ownerId as ownerId, count(a) as count
      from AssetAssignment a
      where a.returnedAt is null
      group by a.ownerType, a.ownerId
      """)
  List<ActiveOwnerCount> countActiveByOwner();
}

package com.smartbanking.asset.repo;

import com.smartbanking.asset.domain.AssetAssignment;
import com.smartbanking.asset.domain.AssetStatus;
import com.smartbanking.asset.domain.OwnerType;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AssetAssignmentRepository extends JpaRepository<AssetAssignment, UUID> {
  interface ActiveOwnerCount {
    OwnerType getOwnerType();
    UUID getOwnerId();
    long getCount();
  }

  interface ActiveStatusCount {
    AssetStatus getStatus();
    long getCount();
  }

  interface ActiveCategoryCount {
    String getCategoryCode();
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

  @Query("""
      select a.ownerType as ownerType, a.ownerId as ownerId, count(a) as count
      from AssetAssignment a
      join Asset s on s.id = a.assetId
      where a.returnedAt is null
        and s.deletedAt is null
        and (
          s.purchaseDate <= :thresholdDate
          or (s.purchaseDate is null and s.createdAt <= :thresholdInstant)
        )
      group by a.ownerType, a.ownerId
      """)
  List<ActiveOwnerCount> countActiveAgingByOwner(
      @Param("thresholdDate") LocalDate thresholdDate,
      @Param("thresholdInstant") Instant thresholdInstant
  );

  @Query("""
      select s.status as status, count(a) as count
      from AssetAssignment a
      join Asset s on s.id = a.assetId
      where a.returnedAt is null
        and s.deletedAt is null
      group by s.status
      """)
  List<ActiveStatusCount> countActiveByAssetStatus();

  @Query("""
      select s.categoryCode as categoryCode, count(a) as count
      from AssetAssignment a
      join Asset s on s.id = a.assetId
      where a.returnedAt is null
        and s.deletedAt is null
      group by s.categoryCode
      """)
  List<ActiveCategoryCount> countActiveByAssetCategory();
}

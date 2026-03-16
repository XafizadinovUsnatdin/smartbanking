package com.smartbanking.asset.repo;

import com.smartbanking.asset.domain.Asset;
import com.smartbanking.asset.domain.AssetStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AssetRepository extends JpaRepository<Asset, UUID>, JpaSpecificationExecutor<Asset> {
  boolean existsBySerialNumber(String serialNumber);
  boolean existsByCategoryCode(String categoryCode);
  boolean existsByCategoryCodeAndDeletedAtIsNull(String categoryCode);
  Optional<Asset> findByIdAndDeletedAtIsNull(UUID id);

  interface AvailableSummaryRow {
    String getCategoryCode();
    String getType();
    long getCount();
  }

  @Query("""
      select a.categoryCode as categoryCode, a.type as type, count(a) as count
      from Asset a
      left join AssetAssignment asg on asg.assetId = a.id and asg.returnedAt is null
      where a.deletedAt is null and a.status = :status and asg.id is null
      group by a.categoryCode, a.type
      order by count(a) desc
      """)
  List<AvailableSummaryRow> availableSummary(@Param("status") AssetStatus status);

  @Query("""
      select a.id
      from Asset a
      left join AssetAssignment asg on asg.assetId = a.id and asg.returnedAt is null
      where a.deletedAt is null
        and a.status = :status
        and a.categoryCode = :categoryCode
        and lower(a.type) = lower(:type)
        and asg.id is null
      order by a.createdAt asc
      """)
  List<UUID> findAvailableIds(
      @Param("status") AssetStatus status,
      @Param("categoryCode") String categoryCode,
      @Param("type") String type,
      Pageable pageable
  );
}

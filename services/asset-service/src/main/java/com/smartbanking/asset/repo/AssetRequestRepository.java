package com.smartbanking.asset.repo;

import com.smartbanking.asset.domain.AssetRequest;
import com.smartbanking.asset.domain.AssetRequestStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AssetRequestRepository extends JpaRepository<AssetRequest, UUID> {
  List<AssetRequest> findAllByRequesterIdOrderByCreatedAtDesc(UUID requesterId);

  List<AssetRequest> findAllByStatusOrderByCreatedAtDesc(AssetRequestStatus status);

  @Query("""
      select r
      from AssetRequest r
      order by r.createdAt desc
      """)
  List<AssetRequest> findAllLatest();

  interface DemandSummaryRow {
    String getCategoryCode();
    String getAssetType();
    long getQuantity();
  }

  @Query(value = """
      select
        i.category_code as categoryCode,
        i.asset_type as assetType,
        sum(i.quantity) as quantity
      from asset_request_items i
      join asset_requests r on r.id = i.request_id
      where r.status in (:statuses)
      group by i.category_code, i.asset_type
      order by sum(i.quantity) desc
      """, nativeQuery = true)
  List<DemandSummaryRow> demandSummary(@Param("statuses") List<String> statuses);

  Optional<AssetRequest> findById(UUID id);
}


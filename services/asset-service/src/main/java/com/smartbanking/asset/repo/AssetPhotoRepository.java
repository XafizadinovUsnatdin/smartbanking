package com.smartbanking.asset.repo;

import com.smartbanking.asset.domain.AssetPhoto;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AssetPhotoRepository extends JpaRepository<AssetPhoto, UUID> {
  List<AssetPhoto> findAllByAssetIdOrderByCreatedAtDesc(UUID assetId);

  @Query(value = """
      select distinct on (asset_id) *
      from asset_photos
      where asset_id in (:assetIds)
      order by asset_id, created_at desc
      """, nativeQuery = true)
  List<AssetPhoto> findLatestByAssetIds(@Param("assetIds") List<UUID> assetIds);
}

package com.smartbanking.asset.repo;

import com.smartbanking.asset.domain.InventorySession;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventorySessionRepository extends JpaRepository<InventorySession, UUID> {}


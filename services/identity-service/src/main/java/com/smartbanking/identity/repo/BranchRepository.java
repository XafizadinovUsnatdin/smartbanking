package com.smartbanking.identity.repo;

import com.smartbanking.identity.domain.Branch;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BranchRepository extends JpaRepository<Branch, UUID> {}


package com.smartbanking.identity.repo;

import com.smartbanking.identity.domain.Department;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepository extends JpaRepository<Department, UUID> {
  List<Department> findAllByBranchId(UUID branchId);
}


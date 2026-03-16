package com.smartbanking.identity.repo;

import com.smartbanking.identity.domain.EmployeeSignupRequest;
import com.smartbanking.identity.domain.EmployeeSignupRequestStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeSignupRequestRepository extends JpaRepository<EmployeeSignupRequest, UUID> {
  boolean existsByTelegramUserIdAndStatus(long telegramUserId, EmployeeSignupRequestStatus status);

  boolean existsByTelegramChatIdAndStatus(long telegramChatId, EmployeeSignupRequestStatus status);

  List<EmployeeSignupRequest> findAllByStatusOrderByCreatedAtDesc(EmployeeSignupRequestStatus status);
}


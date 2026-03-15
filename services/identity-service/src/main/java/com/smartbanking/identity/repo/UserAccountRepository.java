package com.smartbanking.identity.repo;

import com.smartbanking.identity.domain.UserAccount;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {
  Optional<UserAccount> findByUsername(String username);
  boolean existsByUsername(String username);
  Optional<UserAccount> findByTelegramUserId(Long telegramUserId);
  Optional<UserAccount> findByTelegramUsernameIgnoreCase(String telegramUsername);
}

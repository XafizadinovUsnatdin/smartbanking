package com.smartbanking.identity.bootstrap;

import com.smartbanking.identity.domain.Role;
import com.smartbanking.identity.domain.UserAccount;
import com.smartbanking.identity.repo.UserAccountRepository;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class BootstrapAdmin implements ApplicationRunner {
  private static final Logger log = LoggerFactory.getLogger(BootstrapAdmin.class);

  private final UserAccountRepository userRepo;
  private final PasswordEncoder passwordEncoder;

  private final String username;
  private final String password;
  private final String fullName;

  public BootstrapAdmin(
      UserAccountRepository userRepo,
      PasswordEncoder passwordEncoder,
      @Value("${bootstrap.admin.username:}") String username,
      @Value("${bootstrap.admin.password:}") String password,
      @Value("${bootstrap.admin.full-name:}") String fullName
  ) {
    this.userRepo = userRepo;
    this.passwordEncoder = passwordEncoder;
    this.username = username == null ? "" : username.trim();
    this.password = password == null ? "" : password;
    this.fullName = (fullName == null || fullName.isBlank()) ? "Admin" : fullName.trim();
  }

  @Override
  public void run(ApplicationArguments args) {
    if (username.isBlank() || password.isBlank()) {
      return;
    }

    if (userRepo.count() > 0) {
      return;
    }

    if (userRepo.existsByUsername(username)) {
      return;
    }

    var user = new UserAccount(
        UUID.randomUUID(),
        username,
        passwordEncoder.encode(password),
        fullName,
        null,
        null,
        null,
        Instant.now(),
        null,
        null,
        null,
        null,
        Set.of(Role.ADMIN)
    );
    userRepo.save(user);
    log.info("Bootstrapped first admin user '{}' with role ADMIN", username);
  }
}

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
  private final boolean resetEnabled;

  public BootstrapAdmin(
      UserAccountRepository userRepo,
      PasswordEncoder passwordEncoder,
      @Value("${bootstrap.admin.username:}") String username,
      @Value("${bootstrap.admin.password:}") String password,
      @Value("${bootstrap.admin.full-name:}") String fullName,
      @Value("${bootstrap.admin.reset:false}") boolean resetEnabled
  ) {
    this.userRepo = userRepo;
    this.passwordEncoder = passwordEncoder;
    this.username = username == null ? "" : username.trim();
    this.password = password == null ? "" : password;
    this.fullName = (fullName == null || fullName.isBlank()) ? "Admin" : fullName.trim();
    this.resetEnabled = resetEnabled;
  }

  @Override
  public void run(ApplicationArguments args) {
    if (username.isBlank() || password.isBlank()) {
      log.info("Bootstrap admin skipped: username/password not configured");
      return;
    }

    long users = userRepo.count();
    if (users == 0) {
      if (userRepo.existsByUsername(username)) {
        log.info("Bootstrap admin skipped: username '{}' already exists", username);
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
          null,
          Set.of(Role.ADMIN)
      );
      userRepo.save(user);
      log.info("Bootstrapped first admin user '{}' with role ADMIN", username);
      return;
    }

    if (!resetEnabled) {
      log.info("Bootstrap admin skipped: users already exist (count={}). Set BOOTSTRAP_ADMIN_RESET=true to reset password for '{}'.", users, username);
      return;
    }

    var existingOpt = userRepo.findByUsername(username);
    if (existingOpt.isPresent()) {
      var existing = existingOpt.get();
      if (passwordEncoder.matches(password, existing.getPasswordHash())) {
        log.info("Bootstrap admin reset enabled, but password already matches for '{}'. No changes applied.", username);
        return;
      }
      existing.setPasswordHash(passwordEncoder.encode(password));
      if (existing.getFullName() == null || existing.getFullName().isBlank()) {
        existing.setFullName(fullName);
      }
      if (existing.getRoles() == null || existing.getRoles().isEmpty() || !existing.getRoles().contains(Role.ADMIN)) {
        existing.setRoles(Set.of(Role.ADMIN));
      }
      userRepo.save(existing);
      log.warn("Bootstrap admin password RESET applied for existing user '{}'. Disable BOOTSTRAP_ADMIN_RESET after recovery.", username);
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
        null,
        Set.of(Role.ADMIN)
    );
    userRepo.save(user);
    log.warn("Bootstrap admin password RESET enabled and user '{}' did not exist. Created a new ADMIN user. Disable BOOTSTRAP_ADMIN_RESET after recovery.", username);
  }
}

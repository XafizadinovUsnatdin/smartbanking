package com.smartbanking.identity.web;

import com.smartbanking.identity.domain.Role;
import com.smartbanking.identity.domain.UserAccount;
import com.smartbanking.identity.repo.UserAccountRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
public class UserController {
  private final UserAccountRepository repo;

  public UserController(UserAccountRepository repo) {
    this.repo = repo;
  }

  public record UserResponse(
      UUID id,
      String username,
      String fullName,
      String jobTitle,
      UUID departmentId,
      UUID branchId,
      String phoneNumber,
      String telegramUsername,
      Long telegramUserId,
      Long telegramChatId,
      List<Role> roles,
      Instant createdAt
  ) {}

  public record UserPublicResponse(UUID id, String fullName) {}

  @GetMapping
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER','AUDITOR')")
  public List<UserResponse> list() {
    return repo.findAll().stream().map(UserController::toResponse).toList();
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER','AUDITOR')")
  public UserResponse get(@PathVariable UUID id) {
    UserAccount user = repo.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
    return toResponse(user);
  }

  @GetMapping("/{id}/public")
  @PreAuthorize("isAuthenticated()")
  public UserPublicResponse getPublic(@PathVariable UUID id) {
    UserAccount user = repo.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
    return new UserPublicResponse(user.getId(), user.getFullName());
  }

  @GetMapping("/lookup")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER','AUDITOR')")
  public UserResponse lookup(
      @RequestParam Optional<Long> telegramUserId,
      @RequestParam Optional<String> telegramUsername
  ) {
    if (telegramUserId.isPresent()) {
      return repo.findByTelegramUserId(telegramUserId.get())
          .map(UserController::toResponse)
          .orElseThrow(() -> new NotFoundException("User not found"));
    }
    if (telegramUsername.isPresent()) {
      String username = normalizeTelegramUsername(telegramUsername.get());
      if (username == null) {
        throw new BadRequestException("telegramUsername is blank");
      }
      return repo.findByTelegramUsernameIgnoreCase(username)
          .map(UserController::toResponse)
          .orElseThrow(() -> new NotFoundException("User not found"));
    }
    throw new BadRequestException("telegramUserId or telegramUsername is required");
  }

  public record UpdateContactsRequest(
      @Size(max = 32) String phoneNumber,
      @Size(max = 120) String telegramUsername,
      Long telegramUserId,
      Long telegramChatId
  ) {}

  @PutMapping("/{id}/contacts")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER')")
  public UserResponse updateContacts(@PathVariable UUID id, @Valid @RequestBody UpdateContactsRequest req) {
    UserAccount user = repo.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
    if (req.phoneNumber() != null) {
      user.setPhoneNumber(normalize(req.phoneNumber(), 32));
    }
    if (req.telegramUsername() != null) {
      user.setTelegramUsername(normalizeTelegramUsername(req.telegramUsername()));
    }
    if (req.telegramUserId() != null) {
      user.setTelegramUserId(req.telegramUserId());
    }
    if (req.telegramChatId() != null) {
      user.setTelegramChatId(req.telegramChatId());
    }
    repo.save(user);
    return toResponse(user);
  }

  private static UserResponse toResponse(UserAccount u) {
    return new UserResponse(
        u.getId(),
        u.getUsername(),
        u.getFullName(),
        u.getJobTitle(),
        u.getDepartmentId(),
        u.getBranchId(),
        u.getPhoneNumber(),
        u.getTelegramUsername(),
        u.getTelegramUserId(),
        u.getTelegramChatId(),
        u.getRoles().stream().toList(),
        u.getCreatedAt()
    );
  }

  private static String normalize(String raw, int maxLen) {
    if (raw == null) return null;
    String v = raw.trim();
    if (v.isEmpty()) return null;
    return v.length() <= maxLen ? v : v.substring(0, maxLen);
  }

  private static String normalizeTelegramUsername(String raw) {
    String v = normalize(raw, 120);
    if (v == null) return null;
    if (v.startsWith("@")) v = v.substring(1);
    return v.trim().isEmpty() ? null : v.trim();
  }
}

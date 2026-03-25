package com.smartbanking.identity.web;

import com.smartbanking.identity.domain.Role;
import com.smartbanking.identity.domain.UserAccount;
import com.smartbanking.identity.domain.Department;
import com.smartbanking.identity.repo.DepartmentRepository;
import com.smartbanking.identity.repo.UserAccountRepository;
import com.smartbanking.identity.security.JwtService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {
  private final UserAccountRepository userRepo;
  private final DepartmentRepository departmentRepo;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;

  public AuthController(UserAccountRepository userRepo, DepartmentRepository departmentRepo, PasswordEncoder passwordEncoder, JwtService jwtService) {
    this.userRepo = userRepo;
    this.departmentRepo = departmentRepo;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
  }

  public record RegisterRequest(
      @NotBlank @Size(max = 120) String username,
      @NotBlank @Size(min = 8, max = 100) String password,
      @NotBlank @Size(max = 200) String fullName
  ) {}

  public record LoginRequest(@NotBlank String username, @NotBlank String password) {}

  public record TokenResponse(String accessToken, String refreshToken) {}

  @PostMapping("/auth/register")
  @ResponseStatus(HttpStatus.CREATED)
  public void register(@Valid @RequestBody RegisterRequest req) {
    boolean firstUser = userRepo.count() == 0;
    if (!firstUser) {
      throw new ForbiddenException("Registration is disabled. Ask ADMIN to create users.");
    }
    if (userRepo.existsByUsername(req.username())) {
      throw new ConflictException("Username already exists");
    }
    var user = new UserAccount(
        UUID.randomUUID(),
        req.username(),
        passwordEncoder.encode(req.password()),
        req.fullName(),
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
  }

  @PostMapping("/auth/login")
  public TokenResponse login(@Valid @RequestBody LoginRequest req) {
    UserAccount user = userRepo.findByUsername(req.username())
        .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));
    if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
      throw new UnauthorizedException("Invalid credentials");
    }
    user.setLastLoginAt(Instant.now());
    userRepo.save(user);
    return new TokenResponse(
        jwtService.issueAccessToken(user.getId(), user.getUsername(), user.getRoles()),
        jwtService.issueRefreshToken(user.getId(), user.getUsername(), user.getRoles())
    );
  }

  public record RefreshRequest(@NotBlank String refreshToken) {}

  @PostMapping("/auth/refresh")
  public TokenResponse refresh(@Valid @RequestBody RefreshRequest req) {
    var claims = jwtService.parse(req.refreshToken());
    if (!"refresh".equals(claims.get("typ", String.class))) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    UUID userId = UUID.fromString(claims.getSubject());
    UserAccount user = userRepo.findById(userId).orElseThrow(() -> new UnauthorizedException("User not found"));
    return new TokenResponse(
        jwtService.issueAccessToken(user.getId(), user.getUsername(), user.getRoles()),
        jwtService.issueRefreshToken(user.getId(), user.getUsername(), user.getRoles())
    );
  }

  public record CreatedUserResponse(UUID id, String username, String fullName, Set<Role> roles) {}

  @PostMapping("/auth/admin/create-user")
  @PreAuthorize("hasRole('ADMIN')")
  @ResponseStatus(HttpStatus.CREATED)
  public CreatedUserResponse adminCreateUser(@Valid @RequestBody AdminCreateUserRequest req) {
    if (userRepo.existsByUsername(req.username())) {
      throw new ConflictException("Username already exists");
    }

    Set<Role> roles = req.roles() == null ? Set.of() : req.roles();
    if (roles.contains(Role.EMPLOYEE) && req.departmentId() == null) {
      throw new BadRequestException("departmentId is required for EMPLOYEE");
    }

    UUID departmentId = req.departmentId();
    UUID branchId = req.branchId();
    if (departmentId != null) {
      Department d = departmentRepo.findById(departmentId).orElseThrow(() -> new NotFoundException("Department not found"));
      branchId = d.getBranchId();
    }
    var user = new UserAccount(
        UUID.randomUUID(),
        req.username(),
        passwordEncoder.encode(req.password()),
        req.fullName(),
        normalize(req.jobTitle(), 120),
        departmentId,
        branchId,
        Instant.now(),
        null,
        normalize(req.phoneNumber(), 32),
        normalizeTelegramUsername(req.telegramUsername()),
        req.telegramUserId(),
        req.telegramChatId(),
        roles
    );
    userRepo.save(user);
    return new CreatedUserResponse(user.getId(), user.getUsername(), user.getFullName(), user.getRoles());
  }

  public record AdminCreateUserRequest(
      @NotBlank @Size(max = 120) String username,
      @NotBlank @Size(min = 8, max = 100) String password,
      @NotBlank @Size(max = 200) String fullName,
      @Size(max = 32) String phoneNumber,
      @Size(max = 120) String telegramUsername,
      Long telegramUserId,
      Long telegramChatId,
      @Size(max = 120) String jobTitle,
      UUID departmentId,
      UUID branchId,
      Set<Role> roles
  ) {}

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
    v = v.trim();
    return v.isEmpty() ? null : v;
  }
}

package com.smartbanking.identity.web;

import com.smartbanking.identity.domain.EmployeeSignupRequest;
import com.smartbanking.identity.domain.EmployeeSignupRequestStatus;
import com.smartbanking.identity.domain.Role;
import com.smartbanking.identity.domain.UserAccount;
import com.smartbanking.identity.domain.Department;
import com.smartbanking.identity.repo.DepartmentRepository;
import com.smartbanking.identity.repo.EmployeeSignupRequestRepository;
import com.smartbanking.identity.repo.UserAccountRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/employee-signup-requests")
public class EmployeeSignupRequestController {
  private static final SecureRandom random = new SecureRandom();

  private final EmployeeSignupRequestRepository reqRepo;
  private final UserAccountRepository userRepo;
  private final DepartmentRepository departmentRepo;
  private final PasswordEncoder passwordEncoder;

  public EmployeeSignupRequestController(EmployeeSignupRequestRepository reqRepo, UserAccountRepository userRepo, DepartmentRepository departmentRepo, PasswordEncoder passwordEncoder) {
    this.reqRepo = reqRepo;
    this.userRepo = userRepo;
    this.departmentRepo = departmentRepo;
    this.passwordEncoder = passwordEncoder;
  }

  public record SignupRequestResponse(
      UUID id,
      String fullName,
      String jobTitle,
      String phoneNumber,
      String telegramUsername,
      long telegramUserId,
      long telegramChatId,
      EmployeeSignupRequestStatus status,
      Instant createdAt,
      Instant decidedAt,
      String decidedBy,
      String decisionNote,
      UUID createdUserId
  ) {}

  public record CreateSignupRequest(
      @NotBlank @Size(max = 200) String fullName,
      @NotBlank @Size(max = 120) String jobTitle,
      @NotBlank @Size(max = 32) String phoneNumber,
      @Size(max = 120) String telegramUsername,
      @NotNull Long telegramUserId,
      @NotNull Long telegramChatId
  ) {}

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER')")
  @ResponseStatus(HttpStatus.CREATED)
  public SignupRequestResponse create(@Valid @RequestBody CreateSignupRequest req) {
    long tgUserId = req.telegramUserId();
    long tgChatId = req.telegramChatId();

    if (userRepo.findByTelegramUserId(tgUserId).isPresent()) {
      throw new ConflictException("User already exists for telegramUserId=" + tgUserId);
    }

    String tgUsername = normalizeTelegramUsername(req.telegramUsername());
    if (tgUsername != null && userRepo.findByTelegramUsernameIgnoreCase(tgUsername).isPresent()) {
      throw new ConflictException("User already exists for telegramUsername=" + tgUsername);
    }

    if (reqRepo.existsByTelegramUserIdAndStatus(tgUserId, EmployeeSignupRequestStatus.PENDING)
        || reqRepo.existsByTelegramChatIdAndStatus(tgChatId, EmployeeSignupRequestStatus.PENDING)) {
      throw new ConflictException("Signup request already submitted");
    }

    EmployeeSignupRequest saved = reqRepo.save(new EmployeeSignupRequest(
        UUID.randomUUID(),
        normalize(req.fullName(), 200),
        normalize(req.jobTitle(), 120),
        normalize(req.phoneNumber(), 32),
        tgUsername,
        tgUserId,
        tgChatId,
        EmployeeSignupRequestStatus.PENDING,
        Instant.now()
    ));
    return toResponse(saved);
  }

  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  public List<SignupRequestResponse> list(@RequestParam Optional<EmployeeSignupRequestStatus> status) {
    EmployeeSignupRequestStatus s = status.orElse(EmployeeSignupRequestStatus.PENDING);
    return reqRepo.findAllByStatusOrderByCreatedAtDesc(s).stream().map(EmployeeSignupRequestController::toResponse).toList();
  }

  public record DecisionRequest(@Size(max = 1000) String note, UUID departmentId) {}

  @PostMapping("/{id}/approve")
  @PreAuthorize("hasRole('ADMIN')")
  public SignupRequestResponse approve(@PathVariable UUID id, @Valid @RequestBody(required = false) DecisionRequest req, Authentication auth) {
    EmployeeSignupRequest r = reqRepo.findById(id).orElseThrow(() -> new NotFoundException("Request not found"));
    if (r.getStatus() != EmployeeSignupRequestStatus.PENDING) {
      throw new ConflictException("Request already decided");
    }
    if (req == null || req.departmentId() == null) {
      throw new BadRequestException("departmentId is required");
    }

    if (userRepo.findByTelegramUserId(r.getTelegramUserId()).isPresent()) {
      throw new ConflictException("User already exists for telegramUserId=" + r.getTelegramUserId());
    }

    String baseUsername = r.getTelegramUsername();
    if (baseUsername == null || baseUsername.isBlank()) {
      baseUsername = "tg_" + r.getTelegramUserId();
    }
    baseUsername = normalize(baseUsername.replaceFirst("^@", ""), 120);
    if (baseUsername == null) {
      baseUsername = "tg_" + r.getTelegramUserId();
    }

    String username = baseUsername;
    if (userRepo.existsByUsername(username)) {
      username = baseUsername + "_" + id.toString().substring(0, 6);
      if (username.length() > 120) {
        username = username.substring(0, 120);
      }
    }

    String rawPassword = "Tg" + randomHex(24) + "!";
    Department dept = departmentRepo.findById(req.departmentId()).orElseThrow(() -> new NotFoundException("Department not found"));
    var user = new UserAccount(
        UUID.randomUUID(),
        username,
        passwordEncoder.encode(rawPassword),
        r.getFullName(),
        r.getJobTitle(),
        req.departmentId(),
        dept.getBranchId(),
        Instant.now(),
        null,
        r.getPhoneNumber(),
        r.getTelegramUsername(),
        r.getTelegramUserId(),
        r.getTelegramChatId(),
        Set.of(Role.EMPLOYEE)
    );
    userRepo.save(user);

    r.approve(actor(auth), normalize(req.note(), 1000), user.getId(), Instant.now());
    EmployeeSignupRequest saved = reqRepo.save(r);
    return toResponse(saved);
  }

  @PostMapping("/{id}/reject")
  @PreAuthorize("hasRole('ADMIN')")
  public SignupRequestResponse reject(@PathVariable UUID id, @Valid @RequestBody(required = false) DecisionRequest req, Authentication auth) {
    EmployeeSignupRequest r = reqRepo.findById(id).orElseThrow(() -> new NotFoundException("Request not found"));
    if (r.getStatus() != EmployeeSignupRequestStatus.PENDING) {
      throw new ConflictException("Request already decided");
    }
    r.reject(actor(auth), normalize(req == null ? null : req.note(), 1000), Instant.now());
    EmployeeSignupRequest saved = reqRepo.save(r);
    return toResponse(saved);
  }

  private static SignupRequestResponse toResponse(EmployeeSignupRequest r) {
    return new SignupRequestResponse(
        r.getId(),
        r.getFullName(),
        r.getJobTitle(),
        r.getPhoneNumber(),
        r.getTelegramUsername(),
        r.getTelegramUserId(),
        r.getTelegramChatId(),
        r.getStatus(),
        r.getCreatedAt(),
        r.getDecidedAt(),
        r.getDecidedBy(),
        r.getDecisionNote(),
        r.getCreatedUserId()
    );
  }

  private static String actor(Authentication auth) {
    return auth == null ? "anonymous" : String.valueOf(auth.getPrincipal());
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
    v = v.trim();
    return v.isEmpty() ? null : v;
  }

  private static String randomHex(int length) {
    int bytes = (length + 1) / 2;
    byte[] buf = new byte[bytes];
    random.nextBytes(buf);
    StringBuilder sb = new StringBuilder(bytes * 2);
    for (byte b : buf) {
      sb.append(String.format("%02x", b));
    }
    String out = sb.toString();
    return out.length() <= length ? out : out.substring(0, length);
  }
}

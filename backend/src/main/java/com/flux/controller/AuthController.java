package com.flux.controller;

import com.flux.dto.AuthRequest;
import com.flux.dto.AuthResponse;
import com.flux.dto.RefreshTokenRequest;
import com.flux.model.entity.Rider;
import com.flux.model.entity.User;
import com.flux.model.enums.UserRole;
import com.flux.model.enums.RiderStatus;
import com.flux.security.JwtUtil;
import com.flux.service.FirebaseOtpService;
import com.flux.service.UserService;
import com.flux.service.RiderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final UserService userService;
    private final RiderService riderService;
    private final JwtUtil jwtUtil;
    private final FirebaseOtpService firebaseOtpService;

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody AuthRequest request) {
        String phoneNumber = null;
        try {
            phoneNumber = normalizePhone(request.getMobileNumber());
            log.info("sendOtp requested for mobile={}", phoneNumber);
            String sessionInfoId = firebaseOtpService.initiatePhoneSignIn(phoneNumber, request.getRecaptchaToken());
            log.info("sendOtp succeeded for mobile={}", phoneNumber);
            return ResponseEntity.ok().body(Map.of(
                    "sessionInfoId", sessionInfoId,
                    "message", "OTP sent successfully"
            ));
        } catch (Exception e) {
            log.error("sendOtp failed for mobile={}: {}", phoneNumber, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody AuthRequest request) {
        return handleOtpVerification(request, UserRole.USER, request.getFullName() != null ? request.getFullName() : "User");
    }

    @PostMapping("/rider/verify-otp")
    public ResponseEntity<?> verifyRiderOtp(@RequestBody AuthRequest request) {
        return handleOtpVerification(request, UserRole.RIDER, request.getFullName() != null ? request.getFullName() : "Rider");
    }

    @PostMapping("/verify-firebase-token")
    public ResponseEntity<?> verifyFirebaseToken(@RequestBody AuthRequest request) {
    log.info("verifyFirebaseToken requested for mobile={}", request.getMobileNumber());
    return handleIdTokenVerification(request, UserRole.USER, request.getFullName() != null ? request.getFullName() : "User");
    }

    @PostMapping("/rider/verify-firebase-token")
    public ResponseEntity<?> verifyRiderFirebaseToken(@RequestBody AuthRequest request) {
    log.info("verifyRiderFirebaseToken requested for mobile={}", request.getMobileNumber());
    return handleIdTokenVerification(request, UserRole.RIDER, request.getFullName() != null ? request.getFullName() : "Rider");
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody RefreshTokenRequest request) {
        try {
            String refreshToken = request.getRefreshToken();
            String mobileNumber = jwtUtil.extractMobileNumber(refreshToken);
            log.info("refreshToken requested for mobile={}", mobileNumber);
            if (!jwtUtil.validateToken(refreshToken, mobileNumber)) {
                log.warn("Invalid refresh token for mobile={}", mobileNumber);
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid refresh token"));
            }

            Long userId = jwtUtil.extractUserId(refreshToken);
            String role = jwtUtil.extractRole(refreshToken);
            User user = userService.getUserById(userId);

            String accessToken = jwtUtil.generateToken(
                    user.getMobileNumber(),
                    role,
                    user.getId()
            );

            AuthResponse response = AuthResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .userId(user.getId())
                    .role(role)
                    .message("Token refreshed")
                    .build();

            log.info("refreshToken succeeded for userId={}, mobile={}", userId, mobileNumber);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("refreshToken failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    private ResponseEntity<?> handleOtpVerification(AuthRequest request, UserRole role, String defaultName) {
        String phoneNumber = null;
        try {
            phoneNumber = firebaseOtpService.verifyOtpSession(request.getSessionInfoId(), request.getOtpCode());
            log.info("verifyOtp succeeded for mobile={}", phoneNumber);
            User user = userService.createOrGetUser(
                    phoneNumber,
                    defaultName,
                    role
            );
            return ResponseEntity.ok(buildAuthResponse(user, "Login successful"));
        } catch (Exception e) {
            log.error("verifyOtp failed for mobile={}: {}", phoneNumber, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    private ResponseEntity<?> handleIdTokenVerification(AuthRequest request, UserRole role, String defaultName) {
        String phoneNumber = null;
        try {
            phoneNumber = firebaseOtpService.verifyIdToken(request.getIdToken(), request.getMobileNumber());
            log.info("verifyIdToken succeeded for mobile={}", phoneNumber);
            UserService.UserResult result = userService.createOrGetUserWithStatus(
                    phoneNumber,
                    defaultName,
                    role
            );
            return ResponseEntity.ok(buildAuthResponse(result.getUser(), "Login successful", result.isNewlyCreated()));
        } catch (Exception e) {
            log.error("verifyIdToken failed for mobile={}: {}", phoneNumber, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    private AuthResponse buildAuthResponse(User user, String message) {
        return buildAuthResponse(user, message, false);
    }

    private AuthResponse buildAuthResponse(User user, String message, boolean isNewUser) {
        String accessToken = jwtUtil.generateToken(
                user.getMobileNumber(),
                user.getRole().name(),
                user.getId()
        );

        String refreshToken = jwtUtil.generateRefreshToken(
                user.getMobileNumber(),
                user.getRole().name(),
                user.getId()
        );

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(user.getId())
                .role(user.getRole().name())
                .message(message)
                .isNewUser(isNewUser)
                .fullName(user.getFullName())
                .profilePhotoUrl(user.getProfilePhotoUrl())
                .build();
    }

    private String normalizePhone(String mobileNumber) {
        if (mobileNumber == null || mobileNumber.isBlank()) {
            throw new IllegalArgumentException("Mobile number is required");
        }
        return mobileNumber.startsWith("+91") ? mobileNumber : "+91" + mobileNumber;
    }
}

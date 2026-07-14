package com.flux.controller;

import com.flux.model.entity.User;
import com.flux.security.JwtUtil;
import com.flux.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    /**
     * Called after OTP verification when isNewUser == true.
     * Body: { "fullName": "...", "profilePhotoUrl": "..." (optional) }
     * Requires: Authorization: Bearer <accessToken>
     */
    @PostMapping("/complete-profile")
    public ResponseEntity<?> completeProfile(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> body) {
        try {
            String token = authHeader.replace("Bearer ", "").trim();
            Long userId = jwtUtil.extractUserId(token);
            log.info("completeProfile called for userId={}", userId);

            String fullName = body.get("fullName");
            String profilePhotoUrl = body.get("profilePhotoUrl");

            if (fullName == null || fullName.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "fullName is required"));
            }

            User updated = userService.completeProfile(userId, fullName, profilePhotoUrl);

            log.info("Profile completed successfully for userId={}, name={}", userId, updated.getFullName());
            return ResponseEntity.ok(Map.of(
                    "message", "Profile completed",
                    "userId", updated.getId(),
                    "fullName", updated.getFullName(),
                    "profilePhotoUrl", updated.getProfilePhotoUrl() != null ? updated.getProfilePhotoUrl() : ""
            ));
        } catch (Exception e) {
            log.error("completeProfile failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Get the currently authenticated user's profile.
     * Requires: Authorization: Bearer <accessToken>
     */
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(
            @RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "").trim();
            Long userId = jwtUtil.extractUserId(token);
            User user = userService.getUserById(userId);
            log.info("getProfile called for userId={}", userId);

            return ResponseEntity.ok(Map.of(
                    "userId", user.getId(),
                    "fullName", user.getFullName(),
                    "mobileNumber", user.getMobileNumber(),
                    "profilePhotoUrl", user.getProfilePhotoUrl() != null ? user.getProfilePhotoUrl() : "",
                    "role", user.getRole().name(),
                    "status", user.getStatus().name()
            ));
        } catch (Exception e) {
            log.error("getProfile failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/fcm-token")
    public ResponseEntity<?> updateFcmToken(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> body) {
        try {
            String token = authHeader.replace("Bearer ", "").trim();
            Long userId = jwtUtil.extractUserId(token);
            String fcmToken = body.get("fcmToken");

            if (fcmToken == null || fcmToken.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "fcmToken is required"));
            }

            userService.updateFcmToken(userId, fcmToken);
            log.info("FCM token updated for userId={}", userId);

            return ResponseEntity.ok(Map.of("message", "FCM token updated successfully"));
        } catch (Exception e) {
            log.error("updateFcmToken failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}




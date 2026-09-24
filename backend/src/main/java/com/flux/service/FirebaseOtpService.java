package com.flux.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.SessionCookieOptions;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
@Slf4j
public class FirebaseOtpService {

    private final FirebaseAuth firebaseAuth;
    private final RestTemplateBuilder restTemplateBuilder;

    @Value("${firebase.api-key}")
    private String firebaseApiKey;

    @Value("${firebase.session-ttl-seconds:300}")
    private long sessionTtlSeconds;

    private RestTemplate restTemplate;

    private final Map<String, OtpSession> pendingSessions = new ConcurrentHashMap<>();
    private final Map<String, AttemptWindow> sendAttempts = new ConcurrentHashMap<>();

    @Value("${firebase.max-send-attempts:5}")
    private int maxSendAttempts;

    @Value("${firebase.send-window-seconds:900}")
    private long sendWindowSeconds;

    @Value("${firebase.max-verify-attempts:5}")
    private int maxVerifyAttempts;

    private RestTemplate restTemplate() {
        if (restTemplate == null) {
            restTemplate = restTemplateBuilder.build();
        }
        return restTemplate;
    }

    public String initiatePhoneSignIn(String phoneNumber, String recaptchaToken) {
        try {
            if (recaptchaToken == null || recaptchaToken.isBlank()) {
                throw new IllegalArgumentException("recaptchaToken is required");
            }

            enforceSendRateLimit(phoneNumber);

            log.info("Initiating phone sign-in for {}", maskPhone(phoneNumber));

            Map<String, String> payload = Map.of(
                    "phoneNumber", phoneNumber,
                    "recaptchaToken", recaptchaToken
            );

            ResponseEntity<Map> response = restTemplate().postForEntity(
                    "https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=" + firebaseApiKey,
                    payload,
                    Map.class
            );

            Map body = response.getBody();
            String sessionInfo = body != null ? (String) body.get("sessionInfo") : null;

            if (sessionInfo == null) {
                throw new IllegalStateException("Failed to obtain sessionInfo from Firebase");
            }

            String sessionInfoId = UUID.randomUUID().toString();
            pendingSessions.put(sessionInfoId, new OtpSession(
                    sessionInfo, Instant.now().plusSeconds(sessionTtlSeconds), new AtomicInteger()));

            return sessionInfoId;
        } catch (Exception e) {
            log.error("Failed to initiate phone sign-in: {}", e.getMessage());
            throw new RuntimeException("Failed to initiate phone sign-in: " + e.getMessage());
        }
    }

    public String verifyOtpSession(String sessionInfoId, String otpCode) {
        if (sessionInfoId == null || sessionInfoId.isBlank()) {
            throw new IllegalArgumentException("sessionInfoId is required");
        }
        if (otpCode == null || otpCode.length() != 6) {
            throw new IllegalArgumentException("OTP must be a 6-digit value");
        }

        OtpSession session = pendingSessions.get(sessionInfoId);
        if (session == null || Instant.now().isAfter(session.expiresAt())) {
            pendingSessions.remove(sessionInfoId);
            throw new IllegalStateException("OTP session expired or invalid");
        }
        if (session.attempts().incrementAndGet() > maxVerifyAttempts) {
            pendingSessions.remove(sessionInfoId);
            throw new IllegalStateException("Too many OTP verification attempts");
        }

        try {
            Map<String, String> payload = Map.of(
                    "sessionInfo", session.sessionInfo(),
                    "code", otpCode
            );

            ResponseEntity<Map> response = restTemplate().postForEntity(
                    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=" + firebaseApiKey,
                    payload,
                    Map.class
            );

            Map body = response.getBody();
            String idToken = body != null ? (String) body.get("idToken") : null;
            
            if (idToken == null) {
                throw new IllegalStateException("Firebase did not return an ID token");
            }
            
            String verifiedPhone = verifyIdToken(idToken);
            pendingSessions.remove(sessionInfoId);
            return verifiedPhone;
        } catch (Exception e) {
            log.error("Failed to verify OTP session: {}", e.getMessage());
            throw new RuntimeException("Failed to verify OTP");
        }
    }

    public String verifyIdToken(String idToken) {
        return verifyIdToken(idToken, null);
    }

    public String verifyIdToken(String idToken, String phoneNumber) {
        try {
            var decodedToken = firebaseAuth.verifyIdToken(idToken);
            String uid = decodedToken.getUid();
            
            String verifiedPhone = (String) decodedToken.getClaims().get("phone_number");
            if (verifiedPhone == null || verifiedPhone.isBlank()) {
                verifiedPhone = firebaseAuth.getUser(uid).getPhoneNumber();
            }
            if (verifiedPhone == null || verifiedPhone.isBlank()) {
                throw new IllegalStateException("Phone number not found in token or claims");
            }
            if (phoneNumber != null && !phoneNumber.isBlank() && !verifiedPhone.equals(phoneNumber)) {
                throw new IllegalArgumentException("Phone number does not match the verified Firebase identity");
            }
            log.info("Firebase token verified for {}", maskPhone(verifiedPhone));
            return verifiedPhone;
        } catch (FirebaseAuthException e) {
            log.error("Failed to verify Firebase token: {}", e.getMessage());
            throw new RuntimeException("Invalid Firebase token: " + e.getMessage());
        }
    }

    public String createSessionCookie(String idToken, long expiresIn) {
        try {
            SessionCookieOptions options = SessionCookieOptions.builder().setExpiresIn(expiresIn).build();
            String sessionCookie = firebaseAuth.createSessionCookie(idToken, options);
            log.info("Session cookie created successfully");
            return sessionCookie;
        } catch (FirebaseAuthException e) {
            log.error("Failed to create session cookie: {}", e.getMessage());
            throw new RuntimeException("Failed to create session cookie: " + e.getMessage());
        }
    }

    private void enforceSendRateLimit(String phoneNumber) {
        Instant now = Instant.now();
        AttemptWindow window = sendAttempts.compute(phoneNumber, (key, existing) -> {
            if (existing == null || now.isAfter(existing.startedAt().plusSeconds(sendWindowSeconds))) {
                return new AttemptWindow(now, new AtomicInteger(1));
            }
            existing.attempts().incrementAndGet();
            return existing;
        });
        if (window.attempts().get() > maxSendAttempts) {
            throw new IllegalStateException("Too many OTP requests. Please try again later.");
        }
    }

    private String maskPhone(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.length() < 4) return "***";
        return "***" + phoneNumber.substring(phoneNumber.length() - 4);
    }

    private record OtpSession(String sessionInfo, Instant expiresAt, AtomicInteger attempts) { }
    private record AttemptWindow(Instant startedAt, AtomicInteger attempts) { }
}

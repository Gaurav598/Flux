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
    private final Map<String, String> idTokenToPhoneMap = new ConcurrentHashMap<>();

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

            log.info("Initiating phone sign-in for: {}", phoneNumber);

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
            pendingSessions.put(sessionInfoId, new OtpSession(sessionInfo, Instant.now().plusSeconds(sessionTtlSeconds)));

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

        OtpSession session = pendingSessions.remove(sessionInfoId);
        if (session == null || Instant.now().isAfter(session.expiresAt())) {
            throw new IllegalStateException("OTP session expired or invalid");
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
            String phoneNumber = body != null ? (String) body.get("phoneNumber") : null;
            
            if (idToken == null) {
                throw new IllegalStateException("Firebase did not return an ID token");
            }
            
            // Store phone number for this ID token since Firebase doesn't include it in claims
            if (phoneNumber != null) {
                idTokenToPhoneMap.put(idToken, phoneNumber);
            }

            return verifyIdToken(idToken);
        } catch (Exception e) {
            log.error("Failed to verify OTP session: {}", e.getMessage());
            throw new RuntimeException("Failed to verify OTP: " + e.getMessage());
        }
    }

    public String verifyIdToken(String idToken) {
        return verifyIdToken(idToken, null);
    }

    public String verifyIdToken(String idToken, String phoneNumber) {
        try {
            var decodedToken = firebaseAuth.verifyIdToken(idToken);
            String uid = decodedToken.getUid();
            
            // If phone number provided in request, use it
            if (phoneNumber != null && !phoneNumber.isBlank()) {
                log.info("Firebase token verified for phone: {}, UID: {}", phoneNumber, uid);
                return phoneNumber;
            }
            
            // Try to get phone number from stored map (from OTP verification)
            phoneNumber = idTokenToPhoneMap.remove(idToken);
            
            // If not found in map, try to get from claims (for direct Firebase auth)
            if (phoneNumber == null) {
                phoneNumber = (String) decodedToken.getClaims().get("phone_number");
            }
            
            if (phoneNumber == null) {
                throw new IllegalStateException("Phone number not found in token or claims");
            }
            
            log.info("Firebase token verified for phone: {}, UID: {}", phoneNumber, uid);
            return phoneNumber;
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

    private record OtpSession(String sessionInfo, Instant expiresAt) { }
}

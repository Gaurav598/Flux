package com.flux.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtUtilTest {
    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret",
                "test-secret-that-is-at-least-thirty-two-bytes-long");
        ReflectionTestUtils.setField(jwtUtil, "expiration", 60_000L);
        ReflectionTestUtils.setField(jwtUtil, "refreshExpiration", 120_000L);
    }

    @Test
    void accessAndRefreshTokensCannotBeInterchanged() {
        String access = jwtUtil.generateToken("+910000000001", "USER", 1L);
        String refresh = jwtUtil.generateRefreshToken("+910000000001", "USER", 1L);

        assertTrue(jwtUtil.isAccessToken(access));
        assertFalse(jwtUtil.isRefreshToken(access));
        assertTrue(jwtUtil.isRefreshToken(refresh));
        assertFalse(jwtUtil.isAccessToken(refresh));
    }
}

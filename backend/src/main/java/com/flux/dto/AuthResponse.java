package com.flux.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private Long userId;
    private String role;
    private String message;
    // true when the user just signed in for the first time and needs to complete their profile
    private boolean isNewUser;
    private String fullName;
    private String profilePhotoUrl;
}

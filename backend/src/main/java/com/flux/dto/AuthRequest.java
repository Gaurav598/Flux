package com.flux.dto;

import lombok.Data;

@Data
public class AuthRequest {
    private String mobileNumber;
    private String otpCode;
    private String fullName;
    private String idToken;
    private String recaptchaToken;
    private String sessionInfoId;
}

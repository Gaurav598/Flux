package com.flux.exception;

public class OtpExpiredException extends IllegalStateException {
    public OtpExpiredException(String message) {
        super(message);
    }
}

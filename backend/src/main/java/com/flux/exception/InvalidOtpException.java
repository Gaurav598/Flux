package com.flux.exception;

public class InvalidOtpException extends IllegalArgumentException {
    public InvalidOtpException(String message) {
        super(message);
    }
}

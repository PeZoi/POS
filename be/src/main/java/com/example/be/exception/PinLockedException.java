package com.example.be.exception;

import lombok.Getter;

@Getter
public class PinLockedException extends RuntimeException {

    private final long retryAfterSeconds;

    public PinLockedException(String message, long retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

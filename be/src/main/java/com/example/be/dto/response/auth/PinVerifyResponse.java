package com.example.be.dto.response.auth;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Token phiên làm việc; gửi lại qua header X-POS-Token")
public record PinVerifyResponse(
        @Schema(description = "Hết hạn (epoch seconds)", example = "1735689600")
        long expiresAtEpochSeconds,
        @Schema(description = "Token phiên (Base64 URL-safe); gửi header X-POS-Token")
        String token
) {
}

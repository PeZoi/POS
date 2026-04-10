package com.example.be.dto.response.auth;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Số giây còn lại trước khi được thử lại PIN")
public record PinLockErrorPayload(
        @Schema(example = "45")
        long retryAfterSeconds
) {
}

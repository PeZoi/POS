package com.example.be.dto.request.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@Schema(description = "Mã PIN đúng 4 chữ số")
public record PinVerifyRequest(
        @NotBlank
        @Pattern(regexp = "^\\d{4}$", message = "pin must be 4 digits")
        @Schema(example = "1234")
        String pin
) {
}

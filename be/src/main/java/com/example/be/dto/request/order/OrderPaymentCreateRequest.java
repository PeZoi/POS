package com.example.be.dto.request.order;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(name = "OrderPaymentCreateRequest")
public record OrderPaymentCreateRequest(
        @Schema(description = "Số tiền thanh toán (VND)", example = "50000")
        @NotNull(message = "amount is required")
        @Min(value = 1, message = "amount must be >= 1")
        Integer amount,

        @Schema(description = "Ghi chú", example = "Khách trả đợt 1")
        @Size(max = 255, message = "note max length is 255")
        String note
) {
}


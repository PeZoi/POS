package com.example.be.dto.response.order;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(name = "OrderPaymentResponse")
public record OrderPaymentResponse(
        Long id,
        Integer amount,
        String note,
        LocalDateTime createdAt
) {
}


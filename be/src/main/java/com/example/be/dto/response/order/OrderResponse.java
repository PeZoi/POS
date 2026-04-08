package com.example.be.dto.response.order;

import com.example.be.enums.OrderStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

@Schema(name = "OrderResponse")
public record OrderResponse(
        Long id,
        String orderCode,
        String customerName,
        Integer paidAmount,
        Integer totalAmount,
        OrderStatus status,
        LocalDateTime createdAt,
        List<OrderItemResponse> items
) {
}


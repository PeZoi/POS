package com.example.be.dto.response.order;

import com.example.be.enums.OrderStatus;
import com.example.be.enums.PaymentMethod;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

@Schema(name = "OrderResponse")
public record OrderResponse(
        Long id,
        String orderCode,
        String customerName,
        Integer totalAmount,
        PaymentMethod paymentMethod,
        OrderStatus status,
        LocalDateTime createdAt,
        List<OrderItemResponse> items
) {
}


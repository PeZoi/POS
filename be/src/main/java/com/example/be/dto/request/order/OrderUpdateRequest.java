package com.example.be.dto.request.order;

import com.example.be.enums.OrderStatus;
import com.example.be.enums.PaymentMethod;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

@Schema(name = "OrderUpdateRequest")
public record OrderUpdateRequest(
        @Schema(example = "QR") PaymentMethod paymentMethod,
        @Schema(example = "PAID") @NotNull OrderStatus status,
        @NotEmpty @Valid List<OrderItemRequest> items
) {
}


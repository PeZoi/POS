package com.example.be.dto.request.order;

import com.example.be.enums.OrderStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

@Schema(name = "OrderCreateRequest")
public record OrderCreateRequest(
        @Schema(example = "PENDING") @NotNull OrderStatus status,
        @Schema(example = "Nguyễn Văn A", description = "Tên khách hàng (có thể bỏ trống/null)") String customerName,
        @Schema(example = "50000", description = "Số tiền đã thanh toán (có thể null)") Integer paidAmount,
        @NotEmpty @Valid List<OrderItemRequest> items
) {
}


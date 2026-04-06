package com.example.be.dto.request.order;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

@Schema(name = "OrderItemRequest")
public record OrderItemRequest(
        @Schema(example = "1") @NotNull Long productId,
        @Schema(example = "2") @NotNull @Min(1) Integer quantity,
        @Schema(example = "15000", description = "Đơn giá tuỳ chỉnh theo dòng; null = lấy giá hiện tại của sản phẩm")
        @Min(0) Integer unitPrice
) {
}


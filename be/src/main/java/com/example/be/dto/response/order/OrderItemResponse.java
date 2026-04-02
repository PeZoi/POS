package com.example.be.dto.response.order;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "OrderItemResponse")
public record OrderItemResponse(
        Long id,
        Long productId,
        String productName,
        String barcode,
        Integer price,
        Integer quantity,
        Integer subtotal
) {
}


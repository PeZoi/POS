package com.example.be.dto.response.product;

import com.example.be.enums.ProductStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(name = "ProductResponse")
public record ProductResponse(
        Long id,
        String name,
        String barcode,
        Integer price,
        ProductStatus status,
        Boolean isAutoCreated,
        Boolean isDeleted,
        LocalDateTime deletedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}


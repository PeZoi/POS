package com.example.be.mapper;

import com.example.be.dto.request.product.ProductCreateRequest;
import com.example.be.dto.request.product.ProductUpdateRequest;
import com.example.be.dto.response.product.ProductResponse;
import com.example.be.entity.ProductEntity;

public class ProductMapper {
    private ProductMapper() {
    }

    public static ProductEntity toEntity(ProductCreateRequest req) {
        ProductEntity e = new ProductEntity();
        e.setName(req.name());
        e.setBarcode(req.barcode());
        e.setPrice(req.price());
        e.setStatus(req.status());
        e.setIsAutoCreated(Boolean.TRUE.equals(req.isAutoCreated()));
        return e;
    }

    public static void apply(ProductEntity e, ProductUpdateRequest req) {
        e.setName(req.name());
        e.setBarcode(req.barcode());
        e.setPrice(req.price());
        e.setStatus(req.status());
        e.setIsAutoCreated(Boolean.TRUE.equals(req.isAutoCreated()));
    }

    public static ProductResponse toResponse(ProductEntity e) {
        return new ProductResponse(
                e.getId(),
                e.getName(),
                e.getBarcode(),
                e.getPrice(),
                e.getStatus(),
                Boolean.TRUE.equals(e.getIsAutoCreated()),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }
}


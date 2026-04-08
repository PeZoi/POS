package com.example.be.service;

import com.example.be.dto.request.product.ProductCreateRequest;
import com.example.be.dto.request.product.ProductUpdateRequest;
import com.example.be.dto.response.product.ProductResponse;

import java.util.List;

public interface ProductService {
    List<ProductResponse> list(boolean deleted);

    /**
     * Tìm theo tên hoặc barcode (LIKE, không phân biệt hoa thường), tối đa {@code limit} bản ghi.
     */
    List<ProductResponse> search(String q, int limit, boolean deleted);

    ProductResponse getById(Long id);

    ProductResponse getByBarcode(String barcode);

    ProductResponse create(ProductCreateRequest request);

    ProductResponse update(Long id, ProductUpdateRequest request);

    void delete(Long id);

    ProductResponse restore(Long id);
}


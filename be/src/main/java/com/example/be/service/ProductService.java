package com.example.be.service;

import com.example.be.dto.request.product.ProductCreateRequest;
import com.example.be.dto.request.product.ProductUpdateRequest;
import com.example.be.dto.response.product.ProductResponse;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;

import java.util.List;

public interface ProductService {
    List<ProductResponse> list(boolean deleted);

    /**
     * Tìm theo tên hoặc barcode (LIKE, không phân biệt hoa thường), tối đa {@code limit} bản ghi.
     */
    List<ProductResponse> search(String q, int limit, boolean deleted);

    /**
     * Lọc + phân trang dạng slice (không có tổng số bản ghi) cho infinity scroll.
     */
    Slice<ProductResponse> page(
            String q,
            boolean deleted,
            Integer priceMin,
            Integer priceMax,
            int page,
            int size,
            Sort sort
    );

    ProductResponse getById(Long id);

    ProductResponse getByBarcode(String barcode);

    ProductResponse create(ProductCreateRequest request);

    ProductResponse update(Long id, ProductUpdateRequest request);

    void delete(Long id);

    ProductResponse restore(Long id);
}


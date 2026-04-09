package com.example.be.service.impl;

import com.example.be.dto.request.product.ProductCreateRequest;
import com.example.be.dto.request.product.ProductUpdateRequest;
import com.example.be.dto.response.product.ProductResponse;
import com.example.be.entity.ProductEntity;
import com.example.be.exception.BadRequestException;
import com.example.be.exception.NotFoundException;
import com.example.be.mapper.ProductMapper;
import com.example.be.repository.ProductRepository;
import com.example.be.service.ProductService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;

    @Override
    public List<ProductResponse> list(boolean deleted) {
        List<ProductEntity> list = deleted
                ? productRepository.findAllDeleted()
                : productRepository.findAllActive();
        return list
                .stream()
                .map(ProductMapper::toResponse)
                .toList();
    }

    @Override
    public List<ProductResponse> search(String q, int limit, boolean deleted) {
        if (q == null) {
            return List.of();
        }
        String trimmed = q.trim();
        if (trimmed.isEmpty()) {
            return List.of();
        }
        // Tránh ký tự đặc biệt của LIKE (%, _)
        String safe = trimmed.replace("%", "").replace("_", "");
        if (safe.isEmpty()) {
            return List.of();
        }
        int cap = Math.min(Math.max(limit, 1), 50);
        return (deleted
                ? productRepository.searchDeletedByNameOrBarcode(safe, PageRequest.of(0, cap))
                : productRepository.searchByNameOrBarcode(safe, PageRequest.of(0, cap)))
                .stream()
                .map(ProductMapper::toResponse)
                .toList();
    }

    @Override
    public Slice<ProductResponse> page(String q, boolean deleted, Integer priceMin, Integer priceMax, int page, int size, Sort sort) {
        String trimmed = q == null ? "" : q.trim();
        // Tránh ký tự đặc biệt của LIKE (%, _)
        String safe = trimmed.replace("%", "").replace("_", "");
        int p = Math.max(page, 0);
        int s = Math.min(Math.max(size, 1), 200);

        Integer min = priceMin != null && priceMin >= 0 ? priceMin : null;
        Integer max = priceMax != null && priceMax >= 0 ? priceMax : null;

        if (min != null && max != null && min > max) {
            throw new BadRequestException("priceMin must be <= priceMax");
        }

        Sort effectiveSort = sort == null || sort.isUnsorted() ? Sort.by(Sort.Direction.DESC, "id") : sort;
        Pageable pageable = PageRequest.of(p, s, effectiveSort);
        return productRepository.pageFiltered(deleted, safe, min, max, pageable)
                .map(ProductMapper::toResponse);
    }

    @Override
    public ProductResponse getById(Long id) {
        ProductEntity p = productRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("Product not found: " + id));
        return ProductMapper.toResponse(p);
    }

    @Override
    public ProductResponse getByBarcode(String barcode) {
        ProductEntity p = productRepository.findTopByBarcodeAndIsDeletedFalseOrderByIdDesc(barcode)
                .orElseThrow(() -> new NotFoundException("Product not found by barcode: " + barcode));
        return ProductMapper.toResponse(p);
    }

    @Override
    @Transactional
    public ProductResponse create(ProductCreateRequest request) {
        if (productRepository.existsByBarcodeAndIsDeletedFalse(request.barcode())) {
            throw new BadRequestException("Barcode already exists: " + request.barcode());
        }
        ProductEntity e = ProductMapper.toEntity(request);
        return ProductMapper.toResponse(productRepository.save(e));
    }

    @Override
    @Transactional
    public ProductResponse update(Long id, ProductUpdateRequest request) {
        if (productRepository.existsByBarcodeAndIdNotAndIsDeletedFalse(request.barcode(), id)) {
            throw new BadRequestException("Barcode already exists: " + request.barcode());
        }
        // Cho phép sửa cả sản phẩm đã xoá (isDeleted=true).
        // Quy tắc barcode vẫn unique trong nhóm đang bán (isDeleted=false).
        ProductEntity e = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product not found: " + id));
        ProductMapper.apply(e, request);
        return ProductMapper.toResponse(productRepository.save(e));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        ProductEntity e = productRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("Product not found: " + id));
        e.setIsDeleted(true);
        e.setDeletedAt(java.time.LocalDateTime.now());
        productRepository.save(e);
    }

    @Override
    @Transactional
    public ProductResponse restore(Long id) {
        ProductEntity e = productRepository.findByIdAndIsDeletedTrue(id)
                .orElseThrow(() -> new NotFoundException("Product not found (deleted): " + id));

        if (productRepository.existsByBarcodeAndIsDeletedFalse(e.getBarcode())) {
            throw new BadRequestException("Barcode already exists (active): " + e.getBarcode());
        }

        e.setIsDeleted(false);
        e.setDeletedAt(null);
        return ProductMapper.toResponse(productRepository.save(e));
    }
}


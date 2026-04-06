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
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;

    @Override
    public List<ProductResponse> list() {
        return productRepository.findAll()
                .stream()
                .sorted(Comparator.comparing(ProductEntity::getId).reversed())
                .map(ProductMapper::toResponse)
                .toList();
    }

    @Override
    public List<ProductResponse> search(String q, int limit) {
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
        return productRepository.searchByNameOrBarcode(safe, PageRequest.of(0, cap))
                .stream()
                .map(ProductMapper::toResponse)
                .toList();
    }

    @Override
    public ProductResponse getById(Long id) {
        ProductEntity p = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product not found: " + id));
        return ProductMapper.toResponse(p);
    }

    @Override
    public ProductResponse getByBarcode(String barcode) {
        ProductEntity p = productRepository.findByBarcode(barcode)
                .orElseThrow(() -> new NotFoundException("Product not found by barcode: " + barcode));
        return ProductMapper.toResponse(p);
    }

    @Override
    @Transactional
    public ProductResponse create(ProductCreateRequest request) {
        if (productRepository.existsByBarcode(request.barcode())) {
            throw new BadRequestException("Barcode already exists: " + request.barcode());
        }
        ProductEntity e = ProductMapper.toEntity(request);
        return ProductMapper.toResponse(productRepository.save(e));
    }

    @Override
    @Transactional
    public ProductResponse update(Long id, ProductUpdateRequest request) {
        if (productRepository.existsByBarcodeAndIdNot(request.barcode(), id)) {
            throw new BadRequestException("Barcode already exists: " + request.barcode());
        }
        ProductEntity e = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product not found: " + id));
        ProductMapper.apply(e, request);
        return ProductMapper.toResponse(productRepository.save(e));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!productRepository.existsById(id)) {
            throw new NotFoundException("Product not found: " + id);
        }
        productRepository.deleteById(id);
    }
}


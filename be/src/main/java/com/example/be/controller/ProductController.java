package com.example.be.controller;

import com.example.be.common.response.ApiResponse;
import com.example.be.dto.request.product.ProductCreateRequest;
import com.example.be.dto.request.product.ProductUpdateRequest;
import com.example.be.dto.response.product.ProductResponse;
import com.example.be.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Tag(name = "Products", description = "CRUD for products")
public class ProductController {

    private final ProductService productService;

    @GetMapping
    @Operation(summary = "List products", description = "Get all products (no pagination).")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success(productService.list()));
    }

    @GetMapping("/search")
    @Operation(summary = "Search products", description = "Search by name or barcode (case-insensitive, partial match).")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> search(
            @RequestParam(value = "q", required = false, defaultValue = "") String q,
            @RequestParam(value = "limit", required = false, defaultValue = "5") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.success(productService.search(q, limit)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get product by id")
    public ResponseEntity<ApiResponse<ProductResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(productService.getById(id)));
    }

    @GetMapping("/by-barcode/{barcode}")
    @Operation(summary = "Get product by barcode", description = "Lookup product by barcode (unique).")
    public ResponseEntity<ApiResponse<ProductResponse>> getByBarcode(@PathVariable String barcode) {
        return ResponseEntity.ok(ApiResponse.success(productService.getByBarcode(barcode)));
    }

    @PostMapping
    @Operation(
            summary = "Create product",
            description = "Create a product. Barcode must be unique.",
            responses = {
                    @io.swagger.v3.oas.annotations.responses.ApiResponse(
                            responseCode = "201",
                            description = "Created",
                            content = @Content(examples = @ExampleObject(value = "{\"code\":\"CREATED\",\"message\":\"Created\",\"status\":201,\"data\":{},\"timestamp\":\"2026-01-01T00:00:00\"}"))
                    )
            }
    )
    public ResponseEntity<ApiResponse<ProductResponse>> create(@RequestBody @Valid ProductCreateRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(productService.create(request)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update product", description = "Update product by id. Barcode must be unique.")
    public ResponseEntity<ApiResponse<ProductResponse>> update(
            @PathVariable Long id,
            @RequestBody @Valid ProductUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.updated(productService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete product")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        productService.delete(id);
        return ResponseEntity.ok(ApiResponse.deleted(null));
    }
}


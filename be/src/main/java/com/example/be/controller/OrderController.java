package com.example.be.controller;

import com.example.be.common.response.ApiResponse;
import com.example.be.dto.request.order.OrderCreateRequest;
import com.example.be.dto.request.order.OrderUpdateRequest;
import com.example.be.dto.response.order.OrderResponse;
import com.example.be.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Tag(name = "Orders", description = "CRUD for orders and order items")
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    @Operation(summary = "List orders", description = "Get all orders with items (no pagination).")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success(orderService.list()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get order by id", description = "Get order details with items.")
    public ResponseEntity<ApiResponse<OrderResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getById(id)));
    }

    @PostMapping
    @Operation(summary = "Create order", description = "Create an order with items. Có thể truyền unitPrice theo từng dòng; nếu null sẽ lấy giá hiện tại của sản phẩm.")
    public ResponseEntity<ApiResponse<OrderResponse>> create(@RequestBody @Valid OrderCreateRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(orderService.create(request)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update order", description = "Replace order items and update status/payment method.")
    public ResponseEntity<ApiResponse<OrderResponse>> update(
            @PathVariable Long id,
            @RequestBody @Valid OrderUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.updated(orderService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete order", description = "Delete an order (items are removed by cascade).")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        orderService.delete(id);
        return ResponseEntity.ok(ApiResponse.deleted(null));
    }
}


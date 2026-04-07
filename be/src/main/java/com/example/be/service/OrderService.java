package com.example.be.service;

import com.example.be.dto.request.order.OrderCreateRequest;
import com.example.be.dto.request.order.OrderUpdateRequest;
import com.example.be.dto.response.order.OrderResponse;
import com.example.be.enums.OrderStatus;

import java.util.List;

public interface OrderService {
    List<OrderResponse> list();

    List<OrderResponse> search(String q, OrderStatus status, int limit);

    OrderResponse getById(Long id);

    OrderResponse create(OrderCreateRequest request);

    OrderResponse update(Long id, OrderUpdateRequest request);

    OrderResponse updateCustomerName(Long id, String customerName);

    void delete(Long id);
}


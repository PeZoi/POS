package com.example.be.service;

import com.example.be.dto.request.order.OrderCreateRequest;
import com.example.be.dto.request.order.OrderUpdateRequest;
import com.example.be.dto.response.order.OrderResponse;

import java.util.List;

public interface OrderService {
    List<OrderResponse> list();

    OrderResponse getById(Long id);

    OrderResponse create(OrderCreateRequest request);

    OrderResponse update(Long id, OrderUpdateRequest request);

    void delete(Long id);
}


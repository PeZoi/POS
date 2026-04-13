package com.example.be.service;

import com.example.be.dto.request.order.OrderCreateRequest;
import com.example.be.dto.request.order.OrderUpdateRequest;
import com.example.be.dto.request.order.OrderPaymentCreateRequest;
import com.example.be.dto.response.order.OrderPaymentResponse;
import com.example.be.dto.response.order.OrderResponse;
import com.example.be.enums.OrderStatus;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;

import java.util.List;

public interface OrderService {
    List<OrderResponse> list();

    List<OrderResponse> search(String q, List<OrderStatus> status, int limit);

    Slice<OrderResponse> page(
            String q,
            List<OrderStatus> status,
            Integer totalMin,
            Integer totalMax,
            int page,
            int size,
            Sort sort
    );

    OrderResponse getById(Long id);

    OrderResponse create(OrderCreateRequest request);

    OrderResponse update(Long id, OrderUpdateRequest request);

    OrderResponse updateCustomerName(Long id, String customerName);

    OrderResponse addPayment(Long orderId, OrderPaymentCreateRequest request);

    List<OrderPaymentResponse> listPayments(Long orderId);

    void delete(Long id);
}


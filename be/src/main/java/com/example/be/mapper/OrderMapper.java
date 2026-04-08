package com.example.be.mapper;

import com.example.be.dto.response.order.OrderItemResponse;
import com.example.be.dto.response.order.OrderResponse;
import com.example.be.entity.OrderEntity;
import com.example.be.entity.OrderItemEntity;
import com.example.be.entity.ProductEntity;

import java.util.List;

public class OrderMapper {
    private OrderMapper() {
    }

    public static OrderResponse toResponse(OrderEntity order) {
        List<OrderItemResponse> items = order.getItems()
                .stream()
                .map(OrderMapper::toItemResponse)
                .toList();
        return new OrderResponse(
                order.getId(),
                order.getOrderCode(),
                order.getCustomerName(),
                order.getPaidAmount(),
                order.getTotalAmount(),
                order.getPaymentMethod(),
                order.getStatus(),
                order.getCreatedAt(),
                items
        );
    }

    private static OrderItemResponse toItemResponse(OrderItemEntity it) {
        ProductEntity p = it.getProduct();
        return new OrderItemResponse(
                it.getId(),
                p.getId(),
                p.getName(),
                p.getBarcode(),
                it.getPrice(),
                it.getQuantity(),
                it.getSubtotal()
        );
    }
}


package com.example.be.service.impl;

import com.example.be.dto.request.order.OrderCreateRequest;
import com.example.be.dto.request.order.OrderItemRequest;
import com.example.be.dto.request.order.OrderUpdateRequest;
import com.example.be.dto.response.order.OrderResponse;
import com.example.be.entity.OrderEntity;
import com.example.be.entity.OrderItemEntity;
import com.example.be.entity.ProductEntity;
import com.example.be.enums.OrderStatus;
import com.example.be.exception.NotFoundException;
import com.example.be.mapper.OrderMapper;
import com.example.be.repository.OrderRepository;
import com.example.be.repository.ProductRepository;
import com.example.be.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    private static final SecureRandom RAND = new SecureRandom();
    private static final DateTimeFormatter ORDER_CODE_DATE = DateTimeFormatter.ofPattern("ddMMyy");

    @Override
    public List<OrderResponse> list() {
        return orderRepository.findAll()
                .stream()
                .sorted(Comparator.comparing(OrderEntity::getId).reversed())
                .map(o -> OrderMapper.toResponse(orderRepository.findWithItemsById(o.getId()).orElse(o)))
                .toList();
    }

    @Override
    public List<OrderResponse> search(String q, OrderStatus status, int limit) {
        String query = q == null ? "" : q.trim();
        Long id = null;
        if (query.matches("\\d+")) {
            try {
                id = Long.parseLong(query);
            } catch (NumberFormatException ignored) {
                id = null;
            }
        }

        int safeLimit = Math.max(1, Math.min(limit, 200));
        return orderRepository.searchWithItems(query, id, status, PageRequest.of(0, safeLimit))
                .stream()
                .map(OrderMapper::toResponse)
                .toList();
    }

    @Override
    public OrderResponse getById(Long id) {
        OrderEntity order = orderRepository.findWithItemsById(id)
                .orElseThrow(() -> new NotFoundException("Order not found: " + id));
        return OrderMapper.toResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse create(OrderCreateRequest request) {
        OrderEntity order = new OrderEntity();
        order.setOrderCode(generateUniqueOrderCode());
        order.setPaymentMethod(request.paymentMethod());
        order.setStatus(request.status());
        String name = request.customerName() == null ? null : request.customerName().trim();
        if (name != null && name.isBlank()) name = null;
        order.setCustomerName(name);
        order.setPaidAmount(request.paidAmount());

        applyItems(order, request.items());
        normalizePaidAmount(order);
        OrderEntity saved = orderRepository.save(order);
        OrderEntity full = orderRepository.findWithItemsById(saved.getId()).orElse(saved);
        return OrderMapper.toResponse(full);
    }

    @Override
    @Transactional
    public OrderResponse update(Long id, OrderUpdateRequest request) {
        OrderEntity order = orderRepository.findWithItemsById(id)
                .orElseThrow(() -> new NotFoundException("Order not found: " + id));

        order.setPaymentMethod(request.paymentMethod());
        order.setStatus(request.status());
        String name = request.customerName() == null ? null : request.customerName().trim();
        if (name != null && name.isBlank()) name = null;
        order.setCustomerName(name);
        order.setPaidAmount(request.paidAmount());

        order.getItems().clear();
        applyItems(order, request.items());
        normalizePaidAmount(order);

        OrderEntity saved = orderRepository.save(order);
        OrderEntity full = orderRepository.findWithItemsById(saved.getId()).orElse(saved);
        return OrderMapper.toResponse(full);
    }

    @Override
    @Transactional
    public OrderResponse updateCustomerName(Long id, String customerName) {
        OrderEntity order = orderRepository.findWithItemsById(id)
                .orElseThrow(() -> new NotFoundException("Order not found: " + id));

        String name = customerName == null ? null : customerName.trim();
        if (name != null && name.isBlank()) name = null;
        order.setCustomerName(name);

        OrderEntity saved = orderRepository.save(order);
        OrderEntity full = orderRepository.findWithItemsById(saved.getId()).orElse(saved);
        return OrderMapper.toResponse(full);
    }

    private void normalizePaidAmount(OrderEntity order) {
        Integer total = order.getTotalAmount() == null ? 0 : order.getTotalAmount();
        Integer paid = order.getPaidAmount();
        if (paid == null) return;
        int p = Math.max(0, paid);
        int t = Math.max(0, total);
        if (p > t) p = t;
        order.setPaidAmount(p);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!orderRepository.existsById(id)) {
            throw new NotFoundException("Order not found: " + id);
        }
        orderRepository.deleteById(id);
    }

    private void applyItems(OrderEntity order, List<OrderItemRequest> items) {
        int total = 0;
        for (OrderItemRequest it : items) {
            ProductEntity product = productRepository.findByIdAndIsDeletedFalse(it.productId())
                    .orElseThrow(() -> new NotFoundException("Product not found: " + it.productId()));

            int price = it.unitPrice() != null ? it.unitPrice() : product.getPrice();
            int subtotal = price * it.quantity();
            total += subtotal;

            OrderItemEntity entity = new OrderItemEntity();
            entity.setOrder(order);
            entity.setProduct(product);
            entity.setPrice(price);
            entity.setQuantity(it.quantity());
            entity.setSubtotal(subtotal);

            order.getItems().add(entity);
        }
        order.setTotalAmount(total);
    }

    /**
     * Format: ddMMyy + 3 số random (000-999), ví dụ 070426123.
     * Có kiểm tra trùng để tránh collision (hiếm).
     */
    private String generateUniqueOrderCode() {
        String prefix = LocalDate.now().format(ORDER_CODE_DATE);
        for (int i = 0; i < 25; i++) {
            int suffix = RAND.nextInt(1000);
            String code = prefix + String.format("%03d", suffix);
            if (!orderRepository.existsByOrderCode(code)) return code;
        }
        // fallback cực hiếm: dùng 4 số (vẫn giữ prefix ddMMyy) để tránh fail request
        int suffix = RAND.nextInt(10_000);
        return prefix + String.format("%04d", suffix);
    }
}


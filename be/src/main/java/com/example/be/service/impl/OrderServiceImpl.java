package com.example.be.service.impl;

import com.example.be.dto.request.order.OrderCreateRequest;
import com.example.be.dto.request.order.OrderItemRequest;
import com.example.be.dto.request.order.OrderPaymentCreateRequest;
import com.example.be.dto.request.order.OrderUpdateRequest;
import com.example.be.dto.response.order.OrderPaymentResponse;
import com.example.be.dto.response.order.OrderResponse;
import com.example.be.entity.OrderEntity;
import com.example.be.entity.OrderItemEntity;
import com.example.be.entity.OrderPaymentEntity;
import com.example.be.entity.ProductEntity;
import com.example.be.enums.OrderStatus;
import com.example.be.exception.BadRequestException;
import com.example.be.exception.NotFoundException;
import com.example.be.mapper.OrderMapper;
import com.example.be.repository.OrderPaymentRepository;
import com.example.be.repository.OrderRepository;
import com.example.be.repository.ProductRepository;
import com.example.be.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
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
    private final OrderPaymentRepository orderPaymentRepository;

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
        Integer totalAmountEq = null;
        if (query.matches("\\d+")) {
            try {
                long n = Long.parseLong(query);
                id = n;
                if (n >= 0 && n <= Integer.MAX_VALUE) {
                    totalAmountEq = (int) n;
                }
            } catch (NumberFormatException ignored) {
                id = null;
            }
        } else {
            totalAmountEq = parseMoneyAmountFilter(query);
        }

        int safeLimit = Math.max(1, Math.min(limit, 200));
        return orderRepository.searchWithItems(query, id, totalAmountEq, status, PageRequest.of(0, safeLimit))
                .stream()
                .map(OrderMapper::toResponse)
                .toList();
    }

    /**
     * Chuỗi chỉ gồm số và dấu phân tách (vd. 50.000, 1 234 567) → lọc theo {@code totalAmount} khớp đúng.
     */
    private static Integer parseMoneyAmountFilter(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String t = raw.trim();
        if (!t.matches("[\\d.,\\s\\u00A0\\u202F]+")) return null;
        if (t.chars().noneMatch(Character::isDigit)) return null;
        String digits = t.replaceAll("\\D", "");
        if (digits.isEmpty()) return null;
        try {
            long n = Long.parseLong(digits);
            if (n >= 0 && n <= Integer.MAX_VALUE) return (int) n;
        } catch (NumberFormatException ignored) {
            return null;
        }
        return null;
    }

    @Override
    public OrderResponse getById(Long id) {
        OrderEntity order = orderRepository.findWithItemsById(id)
                .orElseThrow(() -> new NotFoundException("Order not found: " + id));
        return OrderMapper.toResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse addPayment(Long orderId, OrderPaymentCreateRequest request) {
        OrderEntity order = orderRepository.findWithItemsById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));

        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new BadRequestException("Không thể thanh toán cho hoá đơn đã huỷ.");
        }

        int total = Math.max(0, order.getTotalAmount() == null ? 0 : order.getTotalAmount());
        int currentPaid = Math.max(0, order.getPaidAmount() == null ? 0 : order.getPaidAmount());

        // Backfill 1 record nếu hoá đơn đã có paidAmount trước khi bật lịch sử thanh toán.
        if (currentPaid > 0 && !orderPaymentRepository.existsByOrderId(orderId)) {
            OrderPaymentEntity seed = new OrderPaymentEntity();
            seed.setOrder(order);
            seed.setAmount(currentPaid);
            seed.setNote("Số tiền đã thanh toán trước khi có lịch sử thanh toán");
            orderPaymentRepository.save(seed);
        }

        int alreadyPaid = Math.max(0, orderPaymentRepository.sumAmountByOrderId(orderId));
        int remain = Math.max(0, total - alreadyPaid);

        int amount = request.amount() == null ? 0 : request.amount();
        if (amount <= 0) throw new BadRequestException("Số tiền thanh toán phải >= 1.");
        if (total == 0) throw new BadRequestException("Hoá đơn có tổng tiền = 0, không cần thanh toán.");
        if (remain == 0) throw new BadRequestException("Hoá đơn đã thanh toán đủ.");
        if (amount > remain) {
            throw new BadRequestException("Số tiền thanh toán vượt quá số tiền còn lại: " + remain);
        }

        String note = request.note() == null ? null : request.note().trim();
        if (note != null && note.isBlank()) note = null;

        OrderPaymentEntity payment = new OrderPaymentEntity();
        payment.setOrder(order);
        payment.setAmount(amount);
        payment.setNote(note);
        orderPaymentRepository.save(payment);

        int newPaid = Math.max(0, orderPaymentRepository.sumAmountByOrderId(orderId));
        order.setPaidAmount(newPaid);
        order.setStatus(resolveStatus(total, newPaid, order.getStatus()));

        OrderEntity saved = orderRepository.save(order);
        OrderEntity full = orderRepository.findWithItemsById(saved.getId()).orElse(saved);
        return OrderMapper.toResponse(full);
    }

    @Override
    public List<OrderPaymentResponse> listPayments(Long orderId) {
        if (!orderRepository.existsById(orderId)) {
            throw new NotFoundException("Order not found: " + orderId);
        }
        return orderPaymentRepository.findByOrderIdOrderByIdDesc(orderId)
                .stream()
                .map(p -> new OrderPaymentResponse(
                        p.getId(),
                        p.getAmount(),
                        p.getNote(),
                        p.getCreatedAt()
                ))
                .toList();
    }

    @Override
    @Transactional
    public OrderResponse create(OrderCreateRequest request) {
        final int maxSaveAttempts = 20;
        for (int saveAttempt = 0; saveAttempt < maxSaveAttempts; saveAttempt++) {
            OrderEntity order = new OrderEntity();
            order.setOrderCode(generateUniqueOrderCode());
            order.setStatus(request.status());
            String name = request.customerName() == null ? null : request.customerName().trim();
            if (name != null && name.isBlank()) name = null;
            order.setCustomerName(name);
            order.setPaidAmount(request.paidAmount());

            applyItems(order, request.items());
            normalizePaidAmount(order);
            try {
                OrderEntity saved = orderRepository.save(order);

                // Nếu tạo hoá đơn đã có paidAmount (đủ/1 phần) thì phải có 1 dòng lịch sử thanh toán tương ứng.
                seedPaymentHistoryIfMissing(saved);

                OrderEntity full = orderRepository.findWithItemsById(saved.getId()).orElse(saved);
                return OrderMapper.toResponse(full);
            } catch (DataIntegrityViolationException e) {
                // Trùng mã hoá đơn (đa luồng / hiếm) — random lại 3 số cuối và thử lưu tiếp
                if (saveAttempt == maxSaveAttempts - 1) {
                    throw new BadRequestException(
                            "Không thể tạo mã hoá đơn duy nhất sau nhiều lần thử. Vui lòng thử lại.");
                }
            }
        }
        throw new BadRequestException("Không thể tạo hoá đơn.");
    }

    @Override
    @Transactional
    public OrderResponse update(Long id, OrderUpdateRequest request) {
        OrderEntity order = orderRepository.findWithItemsById(id)
                .orElseThrow(() -> new NotFoundException("Order not found: " + id));

        order.setStatus(request.status());
        String name = request.customerName() == null ? null : request.customerName().trim();
        if (name != null && name.isBlank()) name = null;
        order.setCustomerName(name);
        order.setPaidAmount(request.paidAmount());

        order.getItems().clear();
        applyItems(order, request.items());
        normalizePaidAmount(order);

        OrderEntity saved = orderRepository.save(order);

        // Nếu hệ thống/FE cập nhật paidAmount trực tiếp (hoá đơn cũ), đảm bảo có lịch sử thanh toán (backfill 1 dòng).
        seedPaymentHistoryIfMissing(saved);

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

    private void seedPaymentHistoryIfMissing(OrderEntity order) {
        if (order == null || order.getId() == null) return;
        Integer paid = order.getPaidAmount();
        int paidAmount = paid == null ? 0 : Math.max(0, paid);
        if (paidAmount <= 0) return;
        if (orderPaymentRepository.existsByOrderId(order.getId())) return;

        OrderPaymentEntity seed = new OrderPaymentEntity();
        seed.setOrder(order);
        seed.setAmount(paidAmount);
        seed.setNote(paidAmount >= Math.max(0, order.getTotalAmount() == null ? 0 : order.getTotalAmount())
                ? "Thanh toán đủ khi tạo/cập nhật hoá đơn"
                : "Thanh toán một phần khi tạo/cập nhật hoá đơn");
        orderPaymentRepository.save(seed);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        throw new BadRequestException("Hoá đơn không được xoá. Vui lòng huỷ hoá đơn nếu cần.");
    }

    private OrderStatus resolveStatus(int total, int paid, OrderStatus current) {
        if (current == OrderStatus.CANCELLED) return OrderStatus.CANCELLED;
        if (paid <= 0) return OrderStatus.PENDING;
        if (paid >= total) return OrderStatus.PAID;
        return OrderStatus.PARTIALLY_PAID;
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
     * Format: ddMMyy + 3 chữ số ngẫu nhiên (000–999), ví dụ 080426137.
     * Random lại 3 số cuối cho đến khi {@code existsByOrderCode} báo chưa có (lặp đủ lớn để xử lý nhiều đơn/ngày).
     * Nếu vùng 3 số quá đông: thử hậu tố 4 chữ số.
     */
    private String generateUniqueOrderCode() {
        String prefix = LocalDate.now().format(ORDER_CODE_DATE);
        final int maxThreeDigitTries = 2000;
        for (int i = 0; i < maxThreeDigitTries; i++) {
            int suffix = RAND.nextInt(1000);
            String code = prefix + String.format("%03d", suffix);
            if (!orderRepository.existsByOrderCode(code)) {
                return code;
            }
        }
        for (int i = 0; i < 200; i++) {
            int suffix = RAND.nextInt(10_000);
            String code = prefix + String.format("%04d", suffix);
            if (!orderRepository.existsByOrderCode(code)) {
                return code;
            }
        }
        throw new BadRequestException("Không tạo được mã hoá đơn không trùng (đã thử nhiều lần).");
    }
}


package com.example.be.repository;

import com.example.be.entity.OrderPaymentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderPaymentRepository extends JpaRepository<OrderPaymentEntity, Long> {
    @Query("""
            select p from OrderPaymentEntity p
            where p.order.id = :orderId
            order by p.id desc
            """)
    List<OrderPaymentEntity> findByOrderIdOrderByIdDesc(@Param("orderId") Long orderId);

    boolean existsByOrderId(Long orderId);

    @Query("""
            select coalesce(sum(p.amount), 0) from OrderPaymentEntity p
            where p.order.id = :orderId
            """)
    Integer sumAmountByOrderId(@Param("orderId") Long orderId);
}


package com.example.be.repository;

import com.example.be.entity.OrderEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrderRepository extends JpaRepository<OrderEntity, Long> {
    @EntityGraph(attributePaths = {"items", "items.product"})
    Optional<OrderEntity> findWithItemsById(Long id);

    boolean existsByOrderCode(String orderCode);
}


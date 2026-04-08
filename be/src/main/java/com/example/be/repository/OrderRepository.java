package com.example.be.repository;

import com.example.be.entity.OrderEntity;
import com.example.be.enums.OrderStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<OrderEntity, Long> {
    @EntityGraph(attributePaths = {"items", "items.product"})
    Optional<OrderEntity> findWithItemsById(Long id);

    boolean existsByOrderCode(String orderCode);

    @EntityGraph(attributePaths = {"items", "items.product"})
    @Query("""
            select o from OrderEntity o
            where (:status is null or o.status = :status)
              and (
                    :q is null
                    or :q = ''
                    or lower(o.orderCode) like lower(concat('%', :q, '%'))
                    or (:id is not null and o.id = :id)
                    or (:totalAmountEq is not null and o.totalAmount = :totalAmountEq)
                    or (o.customerName is not null and lower(o.customerName) like lower(concat('%', :q, '%')))
                  )
            order by o.id desc
            """)
    List<OrderEntity> searchWithItems(
            @Param("q") String q,
            @Param("id") Long id,
            @Param("totalAmountEq") Integer totalAmountEq,
            @Param("status") OrderStatus status,
            Pageable pageable
    );
}


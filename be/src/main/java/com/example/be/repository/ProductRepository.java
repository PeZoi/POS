package com.example.be.repository;

import com.example.be.entity.ProductEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<ProductEntity, Long> {
    Optional<ProductEntity> findByIdAndIsDeletedFalse(Long id);

    Optional<ProductEntity> findByIdAndIsDeletedTrue(Long id);

    Optional<ProductEntity> findTopByBarcodeAndIsDeletedFalseOrderByIdDesc(String barcode);

    boolean existsByBarcodeAndIsDeletedFalse(String barcode);

    boolean existsByBarcodeAndIdNotAndIsDeletedFalse(String barcode, Long id);

    @Query("""
            SELECT p FROM ProductEntity p
            WHERE p.isDeleted = false
            ORDER BY p.id DESC
            """)
    List<ProductEntity> findAllActive();

    @Query("""
            SELECT p FROM ProductEntity p
            WHERE p.isDeleted = true
            ORDER BY p.id DESC
            """)
    List<ProductEntity> findAllDeleted();

    @Query("""
            SELECT p FROM ProductEntity p
            WHERE p.isDeleted = false
              AND (
                LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(p.barcode) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            ORDER BY p.id DESC
            """)
    List<ProductEntity> searchByNameOrBarcode(@Param("q") String q, Pageable pageable);

    @Query("""
            SELECT p FROM ProductEntity p
            WHERE p.isDeleted = true
              AND (
                LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(p.barcode) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            ORDER BY p.id DESC
            """)
    List<ProductEntity> searchDeletedByNameOrBarcode(@Param("q") String q, Pageable pageable);
}


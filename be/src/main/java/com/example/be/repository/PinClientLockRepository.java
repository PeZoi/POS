package com.example.be.repository;

import com.example.be.entity.PinClientLockEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PinClientLockRepository extends JpaRepository<PinClientLockEntity, String> {
}

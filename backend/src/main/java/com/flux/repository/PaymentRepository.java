package com.flux.repository;

import com.flux.model.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByRiderId(Long riderId);
    List<Payment> findByStatus(String status);
    List<Payment> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    Optional<Payment> findFirstByRiderIdAndStatusOrderByCreatedAtDesc(Long riderId, String status);
    Optional<Payment> findByTransactionId(String transactionId);
}

package com.flux.repository;

import com.flux.model.entity.Bid;
import com.flux.model.enums.BidStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BidRepository extends JpaRepository<Bid, Long> {
    List<Bid> findByBookingId(Long bookingId);
    List<Bid> findByRiderId(Long riderId);
    Optional<Bid> findByBookingIdAndRiderId(Long bookingId, Long riderId);
    boolean existsByBookingIdAndRiderId(Long bookingId, Long riderId);
    List<Bid> findByBookingIdAndStatus(Long bookingId, BidStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Bid b WHERE b.id = :id")
    Optional<Bid> findByIdWithLock(@Param("id") Long id);
    long countByBookingId(Long bookingId);
    void deleteByBookingId(Long bookingId);
}

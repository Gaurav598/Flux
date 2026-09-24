package com.flux.repository;

import com.flux.model.entity.Booking;
import com.flux.model.enums.BookingStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByUserId(Long userId);
    List<Booking> findByRiderId(Long riderId);
    List<Booking> findByStatus(BookingStatus status);
    List<Booking> findByStatusIn(List<BookingStatus> statuses);
    long countByStatusIn(List<BookingStatus> statuses);
    List<Booking> findByUserIdAndStatus(Long userId, BookingStatus status);
    List<Booking> findByRiderIdAndStatus(Long riderId, BookingStatus status);
    List<Booking> findByUserIdAndStatusIn(Long userId, List<BookingStatus> statuses);
    List<Booking> findByRiderIdAndStatusIn(Long riderId, List<BookingStatus> statuses);
    Optional<Booking> findFirstByUserIdAndStatusInOrderByUpdatedAtDesc(Long userId, List<BookingStatus> statuses);
    Optional<Booking> findFirstByRiderIdAndStatusInOrderByUpdatedAtDesc(Long riderId, List<BookingStatus> statuses);
    long countByStatus(BookingStatus status);
    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    List<Booking> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT COALESCE(SUM(b.companyCommission), 0.0) FROM Booking b WHERE b.status = 'COMPLETED' AND b.completedAt BETWEEN :start AND :end")
    Double sumCompanyCommissionBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Fetch a booking row with a pessimistic write (SELECT FOR UPDATE) lock.
     * Use this inside @Transactional when making atomic status transitions
     * to prevent concurrent transactions from reading stale status.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booking b WHERE b.id = :id")
    Optional<Booking> findByIdWithLock(@Param("id") Long id);
}

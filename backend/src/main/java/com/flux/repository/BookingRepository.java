package com.flux.repository;

import com.flux.model.entity.Booking;
import com.flux.model.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByUserId(Long userId);
    List<Booking> findByRiderId(Long riderId);
    List<Booking> findByStatus(BookingStatus status);
    List<Booking> findByUserIdAndStatus(Long userId, BookingStatus status);
    List<Booking> findByRiderIdAndStatus(Long riderId, BookingStatus status);
    List<Booking> findByUserIdAndStatusIn(Long userId, List<BookingStatus> statuses);
    List<Booking> findByRiderIdAndStatusIn(Long riderId, List<BookingStatus> statuses);
    long countByStatus(BookingStatus status);
    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}

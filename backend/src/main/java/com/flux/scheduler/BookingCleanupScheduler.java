package com.flux.scheduler;

import com.flux.model.entity.Booking;
import com.flux.model.enums.BookingStatus;
import com.flux.repository.BookingRepository;
import com.flux.repository.BidRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class BookingCleanupScheduler {

    private final BookingRepository bookingRepository;
    private final BidRepository bidRepository;
    
    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Runs every 5 minutes to clean up stale bookings:
     * 1. Delete bookings older than 1 hour that are still in BIDDING/PENDING status
     * 2. Auto-cancel bookings that have been in BIDDING for more than 10 minutes with no response
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    @Transactional
    public void cleanupStaleBookings() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime oneHourAgo = now.minusHours(1);
        LocalDateTime tenMinutesAgo = now.minusMinutes(10);

        try {
            // Find all bookings in BIDDING or PENDING status older than 1 hour
            List<BookingStatus> activeStatuses = Arrays.asList(
                BookingStatus.PENDING,
                BookingStatus.BIDDING
            );

            List<Booking> staleBookings = bookingRepository.findAll().stream()
                .filter(b -> activeStatuses.contains(b.getStatus()))
                .filter(b -> b.getCreatedAt() != null)
                .filter(b -> b.getCreatedAt().isBefore(oneHourAgo))
                .toList();

            if (!staleBookings.isEmpty()) {
                log.info("Cancelling {} stale bookings older than 1 hour", staleBookings.size());
                // Cancel instead of delete to avoid foreign key constraint issues
                for (Booking booking : staleBookings) {
                    try {
                        // Delete associated bids first
                        bidRepository.deleteByBookingId(booking.getId());
                        entityManager.flush();
                        
                        // Now delete the booking
                        bookingRepository.delete(booking);
                        log.info("Deleted stale booking {} and its bids", booking.getId());
                    } catch (Exception ex) {
                        log.error("Error deleting booking {}: {}", booking.getId(), ex.getMessage());
                        // If delete fails, just cancel it
                        booking.setStatus(BookingStatus.CANCELLED_BY_USER);
                        booking.setCancelledAt(now);
                        booking.setCancellationReason("Auto-cancelled - stale booking");
                        bookingRepository.save(booking);
                    }
                }
            }

            // Auto-cancel bookings older than 10 minutes with no bids
            List<Booking> inactiveBookings = bookingRepository.findAll().stream()
                .filter(b -> b.getStatus() == BookingStatus.BIDDING)
                .filter(b -> b.getCreatedAt() != null)
                .filter(b -> b.getCreatedAt().isBefore(tenMinutesAgo))
                .toList();

            for (Booking booking : inactiveBookings) {
                booking.setStatus(BookingStatus.NO_RIDERS_AVAILABLE);
                booking.setCancelledAt(now);
                booking.setCancellationReason("No response from riders within 10 minutes");
                bookingRepository.save(booking);
                log.info("Auto-cancelled booking {} due to inactivity", booking.getId());
            }

        } catch (Exception e) {
            log.error("Error during booking cleanup: {}", e.getMessage(), e);
        }
    }
}

package com.flux.controller;

import com.flux.dto.BookingRequest;
import com.flux.model.entity.Booking;
import com.flux.model.enums.BookingStatus;
import com.flux.service.BookingService;
import com.flux.service.BiddingService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
@Slf4j
public class BookingController {

    private final BookingService bookingService;
    private final BiddingService biddingService;

    @PostMapping
    public ResponseEntity<?> createBooking(@RequestBody BookingRequest bookingRequest, HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            Booking createdBooking = bookingService.createBookingFromRequest(userId, bookingRequest);
            try {
                biddingService.broadcastBookingToNearbyRiders(createdBooking.getId());
            } catch (Exception broadcastError) {
                log.warn("Booking {} created, but broadcast failed: {}", createdBooking.getId(), broadcastError.getMessage());
            }
            return ResponseEntity.ok(createdBooking);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getBooking(@PathVariable Long id) {
        try {
            Booking booking = bookingService.getBookingById(id);
            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/user/my-bookings")
    public ResponseEntity<?> getMyBookings(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            List<Booking> bookings = bookingService.getUserBookings(userId);
            return ResponseEntity.ok(bookings);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/user/active")
    public ResponseEntity<?> getUserActiveBooking(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            return bookingService.getUserActiveBooking(userId)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.noContent().build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/rider/my-bookings")
    public ResponseEntity<?> getRiderBookings(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            List<Booking> bookings = bookingService.getRiderBookings(userId);
            return ResponseEntity.ok(bookings);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/rider/active")
    public ResponseEntity<?> getRiderActiveBooking(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            return bookingService.getRiderActiveBooking(userId)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.noContent().build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/available")
    public ResponseEntity<?> getAvailableBookings(@RequestParam(required = false) Double latitude,
                                                   @RequestParam(required = false) Double longitude,
                                                   @RequestParam(defaultValue = "50.0") Double radius,
                                                   HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            String userRole = (String) request.getAttribute("userRole");
            List<Booking> bookings = "RIDER".equalsIgnoreCase(userRole) && userId != null
                    ? bookingService.getAvailableBookingsForRider(userId, latitude, longitude, radius)
                    : bookingService.getAvailableBookings(latitude, longitude, radius);
            return ResponseEntity.ok(bookings);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateBookingStatus(@PathVariable Long id, @RequestParam BookingStatus status) {
        try {
            Booking booking = bookingService.updateBookingStatus(id, status);
            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelBooking(@PathVariable Long id, @RequestParam String reason, 
                                           @RequestParam boolean byUser) {
        try {
            Booking booking = bookingService.cancelBooking(id, reason, byUser);
            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/rate")
    public ResponseEntity<?> rateBooking(@PathVariable Long id, 
                                         @RequestParam(required = false) Integer userRating,
                                         @RequestParam(required = false) String userReview,
                                         @RequestParam(required = false) Integer riderRating,
                                         @RequestParam(required = false) String riderReview) {
        try {
            Booking booking = bookingService.rateBooking(id, userRating, userReview, riderRating, riderReview);
            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/rider-reached")
    public ResponseEntity<?> markRiderReached(@PathVariable Long id, HttpServletRequest request) {
        try {
            Long riderId = (Long) request.getAttribute("userId");
            Booking booking = bookingService.markRiderReached(id, riderId);
            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/verify-otp")
    public ResponseEntity<?> verifyOtpAndStartRide(@PathVariable Long id, 
                                                    @RequestParam String otp,
                                                    HttpServletRequest request) {
        try {
            Long riderId = (Long) request.getAttribute("userId");
            Booking booking = bookingService.verifyOtpAndStartRide(id, riderId, otp);
            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<?> completeRide(@PathVariable Long id, HttpServletRequest request) {
        try {
            Long riderId = (Long) request.getAttribute("userId");
            Booking booking = bookingService.completeRide(id, riderId);
            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}

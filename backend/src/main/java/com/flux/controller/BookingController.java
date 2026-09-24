package com.flux.controller;

import com.flux.dto.BookingRequest;
import com.flux.model.entity.Booking;
import com.flux.model.enums.BookingStatus;
import com.flux.service.BiddingService;
import com.flux.service.BookingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
@Slf4j
public class BookingController {
    private final BookingService bookingService;
    private final BiddingService biddingService;

    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public Booking createBooking(@Valid @RequestBody BookingRequest bookingRequest, HttpServletRequest request) {
        Long userId = actorId(request);
        Booking created = bookingService.createBookingFromRequest(userId, bookingRequest);
        try {
            biddingService.broadcastBookingToNearbyRiders(created.getId());
        } catch (Exception error) {
            log.warn("Booking {} persisted but its realtime broadcast failed", created.getId(), error);
        }
        return created;
    }

    @GetMapping("/{id}")
    public Booking getBooking(@PathVariable Long id, HttpServletRequest request) {
        return bookingService.getBookingForActor(id, actorId(request), actorRole(request));
    }

    @GetMapping("/user/my-bookings")
    @PreAuthorize("hasRole('USER')")
    public List<Booking> getMyBookings(HttpServletRequest request) {
        return bookingService.getUserBookings(actorId(request));
    }

    @GetMapping("/user/history")
    @PreAuthorize("hasRole('USER')")
    public Page<Booking> getUserHistory(@RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "20") int size,
                                        HttpServletRequest request) {
        return bookingService.getUserBookingHistory(actorId(request), page, size);
    }

    @GetMapping("/user/active")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Booking> getUserActiveBooking(HttpServletRequest request) {
        return bookingService.getUserActiveBooking(actorId(request))
                .map(ResponseEntity::ok).orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/rider/my-bookings")
    @PreAuthorize("hasRole('RIDER')")
    public List<Booking> getRiderBookings(HttpServletRequest request) {
        return bookingService.getRiderBookings(actorId(request));
    }

    @GetMapping("/rider/history")
    @PreAuthorize("hasRole('RIDER')")
    public Page<Booking> getRiderHistory(@RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size,
                                         HttpServletRequest request) {
        return bookingService.getRiderBookingHistory(actorId(request), page, size);
    }

    @GetMapping("/rider/active")
    @PreAuthorize("hasRole('RIDER')")
    public ResponseEntity<Booking> getRiderActiveBooking(HttpServletRequest request) {
        return bookingService.getRiderActiveBooking(actorId(request))
                .map(ResponseEntity::ok).orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/available")
    @PreAuthorize("hasRole('RIDER')")
    public List<Booking> getAvailableBookings(@RequestParam(required = false) Double latitude,
                                              @RequestParam(required = false) Double longitude,
                                              @RequestParam(defaultValue = "50.0") Double radius,
                                              HttpServletRequest request) {
        return bookingService.getAvailableBookingsForRider(actorId(request), latitude, longitude, radius);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public Booking updateBookingStatus(@PathVariable Long id, @RequestParam BookingStatus status,
                                       HttpServletRequest request) {
        return bookingService.updateBookingStatusAsActor(id, status, actorRole(request));
    }

    @PostMapping("/{id}/cancel")
    public Booking cancelBooking(@PathVariable Long id, @RequestParam String reason,
                                 @RequestParam(required = false) Boolean byUser,
                                 HttpServletRequest request) {
        return bookingService.cancelBookingAsActor(id, reason, actorId(request), actorRole(request));
    }

    @PostMapping("/{id}/rate")
    public Booking rateBooking(@PathVariable Long id,
                               @RequestParam(required = false) Integer userRating,
                               @RequestParam(required = false) String userReview,
                               @RequestParam(required = false) Integer riderRating,
                               @RequestParam(required = false) String riderReview,
                               HttpServletRequest request) {
        return bookingService.rateBookingAsActor(id, actorId(request), userRating, userReview,
                riderRating, riderReview);
    }

    @PostMapping("/{id}/rider-reached")
    @PreAuthorize("hasRole('RIDER')")
    public Booking markRiderReached(@PathVariable Long id, HttpServletRequest request) {
        return bookingService.markRiderReached(id, actorId(request));
    }

    @PostMapping("/{id}/accept-user-price")
    @PreAuthorize("hasRole('RIDER')")
    public Booking acceptUserPrice(@PathVariable Long id, HttpServletRequest request) {
        return bookingService.acceptUserPrice(id, actorId(request));
    }

    @PostMapping("/{id}/verify-otp")
    @PreAuthorize("hasRole('RIDER')")
    public Booking verifyOtpAndStartRide(@PathVariable Long id, @RequestParam String otp,
                                         HttpServletRequest request) {
        return bookingService.verifyOtpAndStartRide(id, actorId(request), otp);
    }

    @GetMapping("/{id}/verification-otp")
    @PreAuthorize("hasRole('USER')")
    public Map<String, String> getVerificationOtp(@PathVariable Long id, HttpServletRequest request) {
        return Map.of("otp", bookingService.getVerificationOtpForOwner(id, actorId(request)));
    }

    @GetMapping("/{id}/timeline")
    public List<Map<String, Object>> getTimeline(@PathVariable Long id, HttpServletRequest request) {
        return bookingService.getTimeline(id, actorId(request), actorRole(request));
    }

    @GetMapping("/{id}/rider-location")
    public Map<String, Object> getRiderLocation(@PathVariable Long id, HttpServletRequest request) {
        return bookingService.getRiderLocationForActor(id, actorId(request), actorRole(request));
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasRole('RIDER')")
    public Booking completeRide(@PathVariable Long id, HttpServletRequest request) {
        return bookingService.completeRide(id, actorId(request));
    }

    private Long actorId(HttpServletRequest request) {
        Long id = (Long) request.getAttribute("userId");
        if (id == null) throw new IllegalStateException("Authenticated user is missing");
        return id;
    }

    private String actorRole(HttpServletRequest request) {
        return String.valueOf(request.getAttribute("userRole"));
    }
}

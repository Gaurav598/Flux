package com.flux.controller;

import com.flux.model.entity.Rider;
import com.flux.model.enums.BookingStatus;
import com.flux.model.enums.RiderStatus;
import com.flux.model.enums.UserRole;
import com.flux.service.BookingService;
import com.flux.service.PaymentService;
import com.flux.service.RiderService;
import com.flux.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final RiderService riderService;
    private final UserService userService;
    private final BookingService bookingService;
    private final PaymentService paymentService;

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboardStats() {
        try {
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalUsers", userService.getTotalUserCount());
            stats.put("totalRiders", userService.getUserCountByRole(UserRole.RIDER));
            stats.put("activeRiders", riderService.getRiderCountByStatus(RiderStatus.ACTIVE));
            stats.put("pendingRiders", riderService.getRiderCountByStatus(RiderStatus.PENDING));
            stats.put("todayBookings", bookingService.getTotalBookingsToday());
            stats.put("activeBookings", bookingService.getBookingCountByStatus(BookingStatus.IN_PROGRESS));
            stats.put("todayRevenue", paymentService.getTotalRevenueToday());
            
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/riders/pending")
    public ResponseEntity<?> getPendingRiders() {
        try {
            List<Rider> riders = riderService.getPendingRiders();
            return ResponseEntity.ok(riders);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/riders/{riderId}/approve")
    public ResponseEntity<?> approveRider(@PathVariable Long riderId) {
        try {
            Rider rider = riderService.approveRider(riderId);
            return ResponseEntity.ok(rider);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/riders/{riderId}/reject")
    public ResponseEntity<?> rejectRider(@PathVariable Long riderId, @RequestParam String reason) {
        try {
            Rider rider = riderService.rejectRider(riderId, reason);
            return ResponseEntity.ok(rider);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/riders/active")
    public ResponseEntity<?> getActiveRiders() {
        try {
            List<Rider> riders = riderService.getActiveRiders();
            return ResponseEntity.ok(riders);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/bookings/active")
    public ResponseEntity<?> getActiveBookings() {
        try {
            return ResponseEntity.ok(bookingService.getActiveBookings());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/riders")
    public ResponseEntity<?> getAllRiders(
            @RequestParam(required = false) RiderStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String location) {
        try {
            List<Rider> riders = riderService.getAllRidersWithFilters(status, search, location);
            return ResponseEntity.ok(riders);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/riders/{riderId}")
    public ResponseEntity<?> getRiderDetails(@PathVariable Long riderId) {
        try {
            Rider rider = riderService.getRiderById(riderId);
            return ResponseEntity.ok(rider);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/riders/{riderId}/suspend")
    public ResponseEntity<?> suspendRider(@PathVariable Long riderId, @RequestParam String reason) {
        try {
            Rider rider = riderService.suspendRider(riderId, reason);
            return ResponseEntity.ok(rider);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/riders/{riderId}/activate")
    public ResponseEntity<?> activateRider(@PathVariable Long riderId) {
        try {
            Rider rider = riderService.activateRider(riderId);
            return ResponseEntity.ok(rider);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/bookings")
    public ResponseEntity<?> getAllBookings(
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        try {
            return ResponseEntity.ok(bookingService.getAllBookingsWithFilters(status, search, startDate, endDate));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/bookings/{bookingId}")
    public ResponseEntity<?> getBookingDetails(@PathVariable Long bookingId) {
        try {
            return ResponseEntity.ok(bookingService.getBookingById(bookingId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(@RequestParam(required = false) String search) {
        try {
            return ResponseEntity.ok(userService.getAllUsersWithSearch(search));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<?> getUserDetails(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(userService.getUserById(userId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/analytics")
    public ResponseEntity<?> getAnalytics(
            @RequestParam(required = false, defaultValue = "7") int days) {
        try {
            Map<String, Object> analytics = new HashMap<>();
            analytics.put("totalBookings", bookingService.getTotalBookingsToday());
            analytics.put("totalRevenue", paymentService.getTotalRevenueToday());
            analytics.put("activeRiders", riderService.getRiderCountByStatus(RiderStatus.ACTIVE));
            analytics.put("totalUsers", userService.getTotalUserCount());
            return ResponseEntity.ok(analytics);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}

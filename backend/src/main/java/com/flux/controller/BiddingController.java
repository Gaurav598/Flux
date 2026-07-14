package com.flux.controller;

import com.flux.model.entity.Bid;
import com.flux.model.entity.Rider;
import com.flux.service.BiddingService;
import com.flux.service.RiderService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bids")
@RequiredArgsConstructor
public class BiddingController {

    private final BiddingService biddingService;
    private final RiderService riderService;

    @PostMapping
    public ResponseEntity<?> placeBid(@RequestParam Long bookingId, 
                                      @RequestParam Double bidAmount,
                                      HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            // Get or create rider profile for this user
            Rider rider = riderService.getOrCreateRiderForUser(userId);
            Bid bid = biddingService.placeBid(bookingId, rider.getId(), bidAmount);
            return ResponseEntity.ok(bid);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<?> getBookingBids(@PathVariable Long bookingId) {
        try {
            List<Bid> bids = biddingService.getBookingBids(bookingId);
            return ResponseEntity.ok(bids);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{bidId}/accept")
    public ResponseEntity<?> acceptBid(@PathVariable Long bidId) {
        try {
            var result = biddingService.acceptBid(bidId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtpAndStartRide(@RequestParam Long bookingId, 
                                                    @RequestParam String otp,
                                                    HttpServletRequest request) {
        try {
            Long riderId = (Long) request.getAttribute("userId");
            var booking = biddingService.verifyOtpAndStartRide(bookingId, riderId, otp);
            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/broadcast/{bookingId}")
    public ResponseEntity<?> broadcastBooking(@PathVariable Long bookingId) {
        try {
            biddingService.broadcastBookingToNearbyRiders(bookingId);
            return ResponseEntity.ok("Booking broadcasted to nearby riders");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}

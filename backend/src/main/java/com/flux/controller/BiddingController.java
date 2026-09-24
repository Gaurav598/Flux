package com.flux.controller;

import com.flux.model.entity.Bid;
import com.flux.model.entity.Booking;
import com.flux.model.entity.Rider;
import com.flux.service.BiddingService;
import com.flux.service.RiderService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bids")
@RequiredArgsConstructor
public class BiddingController {
    private final BiddingService biddingService;
    private final RiderService riderService;

    @PostMapping
    @PreAuthorize("hasRole('RIDER')")
    public Bid placeBid(@RequestParam Long bookingId, @RequestParam Double bidAmount,
                        HttpServletRequest request) {
        Rider rider = riderService.getRiderByUserId(actorId(request));
        return biddingService.placeBid(bookingId, rider.getId(), bidAmount);
    }

    @GetMapping("/booking/{bookingId}")
    public List<Bid> getBookingBids(@PathVariable Long bookingId, HttpServletRequest request) {
        return biddingService.getBookingBids(bookingId, actorId(request), actorRole(request));
    }

    @PostMapping("/{bidId}/accept")
    @PreAuthorize("hasRole('USER')")
    public Booking acceptBid(@PathVariable Long bidId, HttpServletRequest request) {
        return biddingService.acceptBid(bidId, actorId(request));
    }

    @PostMapping("/verify-otp")
    @PreAuthorize("hasRole('RIDER')")
    public Booking verifyOtpAndStartRide(@RequestParam Long bookingId, @RequestParam String otp,
                                         HttpServletRequest request) {
        return biddingService.verifyOtpAndStartRide(bookingId, actorId(request), otp);
    }

    @PostMapping("/broadcast/{bookingId}")
    @PreAuthorize("hasRole('ADMIN')")
    public String broadcastBooking(@PathVariable Long bookingId) {
        biddingService.broadcastBookingToNearbyRiders(bookingId);
        return "Booking broadcasted to nearby riders";
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

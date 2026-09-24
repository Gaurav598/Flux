package com.flux.service;

import com.flux.model.entity.Bid;
import com.flux.model.entity.Booking;
import com.flux.model.entity.Rider;
import com.flux.model.enums.BidStatus;
import com.flux.model.enums.BookingStatus;
import com.flux.model.enums.RiderStatus;
import com.flux.repository.BidRepository;
import com.flux.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;
import org.springframework.security.access.AccessDeniedException;

@Service  
@RequiredArgsConstructor 
@Slf4j
public class BiddingService {

    private final BidRepository bidRepository;
    private final BookingRepository bookingRepository;
    private final BookingService bookingService;
    private final RiderService riderService;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${app.bidding.min-bid}")
    private Double minBid;

    @Value("${app.bidding.max-bid}")
    private Double maxBid;

    @Transactional
    public Bid placeBid(Long bookingId, Long riderId, Double bidAmount) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        Rider rider = riderService.getRiderByIdWithLock(riderId);
        if (booking.getStatus() != BookingStatus.BIDDING
                || booking.getBiddingEndTime() == null
                || !LocalDateTime.now().isBefore(booking.getBiddingEndTime())) {
            throw new IllegalStateException("The bidding window has expired");
        }
        riderService.requireEligibleForTrips(rider);
        if (bidAmount == null || bidAmount < minBid || bidAmount > maxBid) {
            throw new IllegalArgumentException("Bid must be between ₹" + minBid + " and ₹" + maxBid);
        }
        List<BookingStatus> activeStatuses = List.of(
                BookingStatus.ACCEPTED,
                BookingStatus.RIDER_EN_ROUTE,
                BookingStatus.RIDER_ARRIVED,
                BookingStatus.IN_PROGRESS
        );
        boolean hasActiveRide = !bookingRepository.findByRiderIdAndStatusIn(riderId, activeStatuses).isEmpty();
        if (hasActiveRide) {
            throw new RuntimeException("You already have an active ride. Complete it before placing new bids.");
        }

        if (!bookingService.vehicleTypesMatch(booking.getVehicleType(), rider.getVehicleType())) {
            throw new RuntimeException("This booking requires a " + booking.getVehicleType() + " rider");
        }

        // Max bid limit: Rider's bid can be at most ₹80 more than the user's entered amount
        Double userAmount = booking.getUserEnteredAmount() != null ? booking.getUserEnteredAmount() : booking.getEstimatedFare();
        if (bidAmount > (userAmount + 80.0)) {
            throw new RuntimeException("Bid amount cannot be more than ₹80 above the user's price (₹" + userAmount + ")");
        }

        if (bidAmount < (userAmount - 50.0)) { // Adding a reasonable lower limit too
            throw new RuntimeException("Bid amount is too low");
        }

        Optional<Bid> existingBid = bidRepository.findByBookingIdAndRiderId(bookingId, riderId);

        if (existingBid.isPresent()) {
            throw new RuntimeException("You have already submitted a bid for this booking.");
        }

        Bid bid = Bid.builder()
                .booking(booking)
                .rider(rider)
                .bidAmount(bidAmount)
                .status(BidStatus.PENDING)
                .build();
        log.info("New bid placed for booking {} by rider {}", bookingId, riderId);

        Bid savedBid = bidRepository.save(bid);

        messagingTemplate.convertAndSend("/topic/booking/" + bookingId + "/bids", savedBid);

        return savedBid;
    }

    public List<Bid> getBookingBids(Long bookingId, Long actorUserId, String actorRole) {
        Booking booking = bookingService.getBookingById(bookingId);
        if (!booking.getUser().getId().equals(actorUserId) && !"ADMIN".equalsIgnoreCase(actorRole)) {
            throw new AccessDeniedException("Only the booking owner can view its bids");
        }
        return bidRepository.findByBookingId(bookingId);
    }

    public List<Bid> getRiderBids(Long riderId) {
        return bidRepository.findByRiderId(riderId);
    }

    @Transactional
    public Booking acceptBid(Long bidId, Long actorUserId) {
        Bid bid = bidRepository.findById(bidId)
                .orElseThrow(() -> new RuntimeException("Bid not found"));

        // Re-fetch booking with a pessimistic write lock (SELECT FOR UPDATE) to prevent
        // two concurrent riders from simultaneously passing the BIDDING guard.
        Booking freshBooking = bookingRepository.findByIdWithLock(bid.getBooking().getId())
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        bid = bidRepository.findByIdWithLock(bidId)
                .orElseThrow(() -> new RuntimeException("Bid not found"));

        if (!freshBooking.getUser().getId().equals(actorUserId)) {
            throw new AccessDeniedException("Only the booking owner can accept a bid");
        }

        if (freshBooking.getStatus() == BookingStatus.ACCEPTED
                && bid.getStatus() == BidStatus.ACCEPTED
                && freshBooking.getRider() != null
                && freshBooking.getRider().getId().equals(bid.getRider().getId())) {
            return freshBooking;
        }

        // Atomic guard: booking must still be in BIDDING status
        if (freshBooking.getStatus() != BookingStatus.BIDDING) {
            throw new RuntimeException("This booking is no longer available — another rider may have already been selected.");
        }

        // Guard: bid must still be PENDING
        if (bid.getStatus() != BidStatus.PENDING) {
            throw new RuntimeException("This bid is no longer valid.");
        }

        if (freshBooking.getBiddingEndTime() == null
                || !LocalDateTime.now().isBefore(freshBooking.getBiddingEndTime())) {
            throw new IllegalStateException("The bidding window has expired");
        }

        Rider lockedRider = riderService.getRiderByIdWithLock(bid.getRider().getId());
        riderService.requireEligibleForTrips(lockedRider);
        List<BookingStatus> activeStatuses = List.of(BookingStatus.ACCEPTED,
                BookingStatus.RIDER_EN_ROUTE, BookingStatus.RIDER_ARRIVED, BookingStatus.IN_PROGRESS);
        boolean hasActiveRide = bookingRepository
                .findByRiderIdAndStatusIn(bid.getRider().getId(), activeStatuses)
                .stream()
                .anyMatch(b -> !b.getId().equals(freshBooking.getId()));
        if (hasActiveRide) {
            throw new RuntimeException("Rider already has an active ride. Cannot accept another booking.");
        }

        bid.setStatus(BidStatus.ACCEPTED);
        bidRepository.save(bid);

        List<Bid> otherBids = bidRepository.findByBookingIdAndStatus(
                bid.getBooking().getId(), BidStatus.PENDING);
        
        for (Bid otherBid : otherBids) {
            if (!otherBid.getId().equals(bidId)) {
                otherBid.setStatus(BidStatus.REJECTED);
                bidRepository.save(otherBid);
                notificationService.notifyRiderWithType(
                        otherBid.getRider().getId(),
                        "Bid Not Selected",
                        "Another rider was selected for this booking",
                        "BID_REJECTED",
                        bid.getBooking().getId()
                );
            }
        }

        Booking booking = bookingService.acceptBid(bid.getBooking().getId(), lockedRider.getId());
        booking.setFinalFare(bid.getBidAmount());
        riderService.updateRiderStatus(lockedRider.getId(), RiderStatus.ON_RIDE);

        bookingRepository.save(booking);

        log.info("Bid {} accepted for booking {}", bidId, bid.getBooking().getId());
        return booking;
    }

    @Transactional
    public Booking verifyOtpAndStartRide(Long bookingId, Long riderUserId, String otp) {
        return bookingService.verifyOtpAndStartRide(bookingId, riderUserId, otp);
    }

    @Transactional
    public void broadcastBookingToNearbyRiders(Long bookingId) {
        Booking booking = bookingService.getBookingById(bookingId);
        
        List<Rider> nearbyRiders;
        String vehicleType = booking.getVehicleType();
        if (vehicleType != null && !vehicleType.isBlank() &&
                !bookingService.vehicleTypesMatch(vehicleType, "Parcel")) {
            nearbyRiders = riderService.getNearbyAvailableRidersByVehicleType(
                    booking.getPickupLatitude(),
                    booking.getPickupLongitude(),
                    10.0,
                    vehicleType
            );
        } else {
            nearbyRiders = riderService.getNearbyAvailableRiders(
                    booking.getPickupLatitude(),
                    booking.getPickupLongitude(),
                    10.0
            );
        }

        for (Rider rider : nearbyRiders) {
            notificationService.notifyRiderWithType(
                    rider.getId(),
                    "New Booking Available",
                    "New " + booking.getServiceType() + " booking nearby. Tap to bid!",
                    "NEW_BOOKING",
                    booking.getId()
            );
            
            messagingTemplate.convertAndSend("/topic/rider/" + rider.getId() + "/bookings", booking);
        }

        log.info("Booking {} broadcasted to {} nearby riders (vehicleType={})", bookingId, nearbyRiders.size(), vehicleType);
    }

    @Transactional
    public void expireBids(Long bookingId) {
        List<Bid> pendingBids = bidRepository.findByBookingIdAndStatus(bookingId, BidStatus.PENDING);
        
        for (Bid bid : pendingBids) {
            bid.setStatus(BidStatus.EXPIRED);
            bidRepository.save(bid);
        }

        log.info("Expired {} bids for booking {}", pendingBids.size(), bookingId);
    }
}

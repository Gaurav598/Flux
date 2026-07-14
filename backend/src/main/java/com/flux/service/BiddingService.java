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
import java.util.Random;

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
    private final Random random = new Random();

    @Value("${app.bidding.min-bid}")
    private Double minBid;

    @Value("${app.bidding.max-bid}")
    private Double maxBid;

    @Transactional
    public Bid placeBid(Long bookingId, Long riderId, Double bidAmount) {
        Booking booking = bookingService.getBookingById(bookingId);
        Rider rider = riderService.getRiderById(riderId);
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

        Bid bid;
        if (existingBid.isPresent()) {
            bid = existingBid.get();
            bid.setPreviousBidAmount(bid.getBidAmount());
            bid.setBidAmount(bidAmount);
            bid.setIsEdited(true);
            log.info("Bid updated for booking {} by rider {}", bookingId, riderId);
        } else {
            bid = Bid.builder()
                    .booking(booking)
                    .rider(rider)
                    .bidAmount(bidAmount)
                    .status(BidStatus.PENDING)
                    .build();
            log.info("New bid placed for booking {} by rider {}", bookingId, riderId);
        }

        Bid savedBid = bidRepository.save(bid);

        messagingTemplate.convertAndSend("/topic/booking/" + bookingId + "/bids", savedBid);

        return savedBid;
    }

    public List<Bid> getBookingBids(Long bookingId) {
        return bidRepository.findByBookingId(bookingId);
    }

    public List<Bid> getRiderBids(Long riderId) {
        return bidRepository.findByRiderId(riderId);
    }

    @Transactional
    public Booking acceptBid(Long bidId) {
        Bid bid = bidRepository.findById(bidId)
                .orElseThrow(() -> new RuntimeException("Bid not found"));
        List<BookingStatus> activeStatuses = List.of(
                BookingStatus.ACCEPTED,
                BookingStatus.RIDER_EN_ROUTE,
                BookingStatus.RIDER_ARRIVED,
                BookingStatus.IN_PROGRESS
        );
        boolean hasActiveRide = bookingRepository
                .findByRiderIdAndStatusIn(bid.getRider().getId(), activeStatuses)
                .stream()
                .anyMatch(b -> !b.getId().equals(bid.getBooking().getId()));
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

        Booking booking = bookingService.acceptBid(bid.getBooking().getId(), bid.getRider().getId());
        riderService.updateRiderStatus(bid.getRider().getId(), RiderStatus.ON_RIDE);

        // Generate 4-digit OTP for verification
        String otp = String.format("%04d", random.nextInt(10000));
        booking.setVerificationOtp(otp);
        bookingRepository.save(booking);

        // Notify rider that bid was accepted (without OTP - rider must ask user for OTP)
        notificationService.notifyRiderWithType(
                bid.getRider().getId(),
                "Bid Accepted!",
                "User accepted your bid. Navigate to pickup location.",
                "RIDE_ACCEPTED",
                booking.getId()
        );
        
        // Notify user with OTP
        notificationService.notifyUserWithType(
                booking.getUser().getId(),
                "Rider Assigned!",
                "Your OTP is: " + otp + ". Share this with your rider when they arrive.",
                "OTP_READY",
                booking.getId()
        );

        log.info("Bid {} accepted for booking {}. OTP generated: {}", bidId, bid.getBooking().getId(), otp);
        return booking;
    }

    @Transactional
    public Booking verifyOtpAndStartRide(Long bookingId, Long riderId, String otp) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (booking.getRider() == null || !booking.getRider().getId().equals(riderId)) {
            throw new RuntimeException("You are not assigned to this booking");
        }

        if (!booking.getStatus().equals(BookingStatus.ACCEPTED)) {
            throw new RuntimeException("Booking is not in accepted state");
        }

        if (booking.getVerificationOtp() == null || !booking.getVerificationOtp().equals(otp)) {
            throw new RuntimeException("Invalid OTP. Please check with the user and try again.");
        }

        // Clear OTP and start the ride
        booking.setVerificationOtp(null);
        booking.setStatus(BookingStatus.IN_PROGRESS);
        booking.setStartedAt(java.time.LocalDateTime.now());
        bookingRepository.save(booking);

        log.info("OTP verified for booking {}. Ride started.", bookingId);
        return booking;
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

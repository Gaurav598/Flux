package com.flux.service;

import com.flux.dto.BookingRequest;
import com.flux.model.entity.Booking;
import com.flux.model.entity.Rider;
import com.flux.model.entity.User;
import com.flux.model.enums.BookingStatus;
import com.flux.model.enums.ServiceType;
import com.flux.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingService {

    private final BookingRepository bookingRepository;
    private final UserService userService;
    private final RiderService riderService;
    private final NotificationService notificationService;

    @Value("${app.bidding.window-seconds}")
    private Integer biddingWindowSeconds;

    @Transactional
    public Booking createBooking(Long userId, Booking bookingData) {
        User user = userService.getUserById(userId);

        Double estimatedFare = calculateEstimatedFare(
                bookingData.getServiceType(),
                bookingData.getEstimatedDistance()
        );

        Booking booking = Booking.builder()
                .user(user)
                .serviceType(bookingData.getServiceType())
                .status(BookingStatus.BIDDING)
                .pickupAddress(bookingData.getPickupAddress())
                .pickupLatitude(bookingData.getPickupLatitude())
                .pickupLongitude(bookingData.getPickupLongitude())
                .dropAddress(bookingData.getDropAddress())
                .dropLatitude(bookingData.getDropLatitude())
                .dropLongitude(bookingData.getDropLongitude())
                .errandDescription(bookingData.getErrandDescription())
                .errandItemsList(bookingData.getErrandItemsList())
                .estimatedBudget(bookingData.getEstimatedBudget())
                .parcelDescription(bookingData.getParcelDescription())
                .parcelWeight(bookingData.getParcelWeight())
                .recipientName(bookingData.getRecipientName())
                .recipientPhone(bookingData.getRecipientPhone())
                .estimatedDistance(bookingData.getEstimatedDistance())
                .estimatedDuration(bookingData.getEstimatedDuration())
                .estimatedFare(estimatedFare)
                .biddingWindowSeconds(biddingWindowSeconds)
                .biddingStartTime(LocalDateTime.now())
                .biddingEndTime(LocalDateTime.now().plusSeconds(biddingWindowSeconds))
                .build();

        Booking savedBooking = bookingRepository.save(booking);
        log.info("Booking created: {} for user: {}", savedBooking.getId(), userId);

        notificationService.notifyUser(userId, "Booking Confirmed", 
                "Your booking is confirmed! Finding riders...");

        return savedBooking;
    }

    @Transactional
    public Booking createBookingFromRequest(Long userId, BookingRequest req) {
        User user = userService.getUserById(userId);
        ServiceType serviceType = resolveServiceType(req.getServiceType());
        Double distance = req.getEstimatedDistance() != null ? req.getEstimatedDistance() : 5.0;

        Double estimatedFare = calculateEstimatedFare(serviceType, distance);

        Double userAmount = req.getUserEnteredAmount() != null ? req.getUserEnteredAmount() : estimatedFare;

        Booking booking = Booking.builder()
                .user(user)
                .serviceType(serviceType)
                .status(BookingStatus.BIDDING)
                .pickupAddress(req.getPickupAddress())
                .pickupLatitude(req.getPickupLatitude())
                .pickupLongitude(req.getPickupLongitude())
                .dropAddress(req.getDropAddress())
                .dropLatitude(req.getDropLatitude())
                .dropLongitude(req.getDropLongitude())
                .errandDescription(req.getDescription())
                .estimatedBudget(req.getEstimatedBudget())
                .parcelDescription(req.getParcelDescription())
                .parcelWeight(req.getParcelWeight())
                .recipientName(req.getRecipientName())
                .recipientPhone(req.getRecipientPhone())
                .estimatedDistance(distance)
                .estimatedDuration(req.getEstimatedDuration())
                .estimatedFare(estimatedFare)
                .userEnteredAmount(userAmount)
                .vehicleType(resolveVehicleType(req.getVehicleType(), serviceType))
                .biddingWindowSeconds(biddingWindowSeconds)
                .biddingStartTime(LocalDateTime.now())
                .biddingEndTime(LocalDateTime.now().plusSeconds(biddingWindowSeconds))
                .build();

        Booking savedBooking = bookingRepository.save(booking);
        log.info("Booking created: {} for user: {} vehicleType: {}", savedBooking.getId(), userId, req.getVehicleType());

        notificationService.notifyUser(userId, "Booking Confirmed",
                "Your booking is confirmed! Finding riders...");

        return savedBooking;
    }

    private ServiceType resolveServiceType(String rawServiceType) {
        if (rawServiceType == null || rawServiceType.isBlank()) {
            return ServiceType.RIDE;
        }
        try {
            return ServiceType.valueOf(rawServiceType.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid service type: " + rawServiceType);
        }
    }

    private String resolveVehicleType(String rawVehicleType, ServiceType serviceType) {
        if (rawVehicleType != null && !rawVehicleType.isBlank()) {
            String normalized = normalizeVehicleType(rawVehicleType);
            return normalized.isBlank()
                    ? rawVehicleType.trim()
                    : normalized.substring(0, 1).toUpperCase() + normalized.substring(1);
        }
        return serviceType == ServiceType.PARCEL ? "Parcel" : "Bike";
    }

    public Booking getBookingById(Long bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
    }

    public List<Booking> getUserBookings(Long userId) {
        return bookingRepository.findByUserId(userId);
    }

    public List<Booking> getRiderBookings(Long riderId) {
        return bookingRepository.findByRiderId(riderId);
    }

    public List<Booking> getActiveBookings() {
        return bookingRepository.findByStatus(BookingStatus.IN_PROGRESS);
    }

    @Transactional
    public Booking acceptBid(Long bookingId, Long riderId) {
        Booking booking = getBookingById(bookingId);
        Rider rider = riderService.getRiderById(riderId);

        booking.setRider(rider);
        booking.setStatus(BookingStatus.ACCEPTED);
        booking.setAcceptedAt(LocalDateTime.now());

        Booking savedBooking = bookingRepository.save(booking);
        log.info("Booking {} accepted by rider {}", bookingId, riderId);

        notificationService.notifyUserWithType(
                booking.getUser().getId(),
                "Rider Found",
                "Rider " + rider.getUser().getFullName() + " is on the way!",
                "RIDER_APPROACHING",
                booking.getId()
        );
        
        notificationService.notifyRiderWithType(
                riderId,
                "Booking Confirmed",
                "Navigate to pickup location",
                "RIDE_ACCEPTED",
                booking.getId()
        );

        return savedBooking;
    }

    @Transactional
    public Booking updateBookingStatus(Long bookingId, BookingStatus status) {
        Booking booking = getBookingById(bookingId);
        booking.setStatus(status);

        if (status == BookingStatus.RIDER_ARRIVED) {
            booking.setRiderArrivedAt(LocalDateTime.now());
            notificationService.notifyUserWithType(
                    booking.getUser().getId(),
                    "Rider Arrived",
                    "Your rider has arrived at the pickup location",
                    "RIDER_ARRIVED",
                    booking.getId()
            );
        } else if (status == BookingStatus.IN_PROGRESS) {
            booking.setStartedAt(LocalDateTime.now());
            notificationService.notifyUserWithType(
                    booking.getUser().getId(),
                    "Ride Started",
                    "Your ride/errand has started",
                    "RIDE_STARTED",
                    booking.getId()
            );
        } else if (status == BookingStatus.COMPLETED) {
            booking.setCompletedAt(LocalDateTime.now());
            userService.incrementBookingCount(booking.getUser().getId());
            riderService.incrementRideCount(booking.getRider().getId());
            notificationService.notifyUserWithType(
                    booking.getUser().getId(),
                    "Ride Completed",
                    "Please rate your rider",
                    "RATE_RIDER",
                    booking.getId()
            );
        }

        Booking savedBooking = bookingRepository.save(booking);
        log.info("Booking {} status updated to {}", bookingId, status);
        return savedBooking;
    }

    @Transactional
    public Booking cancelBooking(Long bookingId, String reason, boolean byUser) {
        Booking booking = getBookingById(bookingId);
        
        booking.setStatus(byUser ? BookingStatus.CANCELLED_BY_USER : BookingStatus.CANCELLED_BY_RIDER);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancellationReason(reason);

        if (!byUser && booking.getRider() != null) {
            riderService.incrementCancellationCount(booking.getRider().getId());
        }

        Booking savedBooking = bookingRepository.save(booking);
        log.info("Booking {} cancelled by {}", bookingId, byUser ? "user" : "rider");

        if (byUser && booking.getRider() != null) {
            notificationService.notifyRiderWithType(
                    booking.getRider().getId(),
                    "Booking Cancelled",
                    "User has cancelled the booking",
                    "BOOKING_CANCELLED",
                    booking.getId()
            );
            riderService.updateRiderStatus(booking.getRider().getId(), com.flux.model.enums.RiderStatus.AVAILABLE);
        } else if (!byUser) {
            notificationService.notifyUserWithType(
                    booking.getUser().getId(),
                    "Booking Cancelled",
                    "Rider has cancelled. Finding another rider...",
                    "BOOKING_CANCELLED",
                    booking.getId()
            );
            if (booking.getRider() != null) {
                riderService.updateRiderStatus(booking.getRider().getId(), com.flux.model.enums.RiderStatus.AVAILABLE);
            }
        }

        return savedBooking;
    }

    @Transactional
    public Booking rateBooking(Long bookingId, Integer userRating, String userReview, 
                                Integer riderRating, String riderReview) {
        Booking booking = getBookingById(bookingId);

        if (userRating != null) {
            booking.setUserRating(userRating);
            booking.setUserReview(userReview);
            riderService.updateRiderRating(booking.getRider().getId(), userRating);
        }

        if (riderRating != null) {
            booking.setRiderRating(riderRating);
            booking.setRiderReview(riderReview);
            userService.updateAverageRating(booking.getUser().getId(), (double) riderRating, false);
        }

        Booking savedBooking = bookingRepository.save(booking);
        log.info("Booking {} rated", bookingId);
        return savedBooking;
    }

    public List<Booking> getAvailableBookings(Double latitude, Double longitude, Double radius) {
        return filterAvailableBookings(null, latitude, longitude, radius);
    }

    public List<Booking> getAvailableBookingsForRider(Long userId, Double latitude, Double longitude, Double radius) {
        Rider rider = riderService.getOrCreateRiderForUser(userId);
        return filterAvailableBookings(rider, latitude, longitude, radius);
    }

    private List<Booking> filterAvailableBookings(Rider rider, Double latitude, Double longitude, Double radius) {
        List<Booking> allBiddingBookings = bookingRepository.findByStatus(BookingStatus.BIDDING);

        // Default radius to 10km if not provided
        final double searchRadius = (radius != null) ? radius : 10.0;

        return allBiddingBookings.stream()
                .filter(booking -> rider == null || vehicleTypesMatch(booking.getVehicleType(), rider.getVehicleType()))
                .filter(booking -> latitude == null || longitude == null || calculateDistance(
                        latitude, longitude,
                        booking.getPickupLatitude(), booking.getPickupLongitude()
                ) <= searchRadius)
                .sorted((b1, b2) -> b2.getCreatedAt().compareTo(b1.getCreatedAt()))
                .toList();
    }

    public boolean vehicleTypesMatch(String bookingVehicleType, String riderVehicleType) {
        String bookingType = normalizeVehicleType(bookingVehicleType);
        if (bookingType.isBlank() || "parcel".equals(bookingType)) {
            return true;
        }
        String riderType = normalizeVehicleType(riderVehicleType);
        return !riderType.isBlank() && bookingType.equals(riderType);
    }

    private String normalizeVehicleType(String value) {
        String raw = value == null ? "" : value.trim().toLowerCase();
        if (raw.contains("parcel") || raw.contains("courier") || raw.contains("delivery")) {
            return "parcel";
        }
        if (raw.contains("auto") || raw.contains("rick") || raw.contains("tuk")) {
            return "auto";
        }
        if (raw.contains("cab") || raw.contains("car") || raw.contains("taxi") || raw.contains("sedan")) {
            return "cab";
        }
        if (raw.contains("bike") || raw.contains("moto") || raw.contains("scoot")) {
            return "bike";
        }
        return raw;
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371;
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private Double calculateEstimatedFare(ServiceType serviceType, Double distance) {
        double baseFare = 40.0;
        double perKmRate = 10.0;

        if (serviceType == ServiceType.ERRAND) {
            baseFare = 50.0;
            perKmRate = 12.0;
        } else if (serviceType == ServiceType.PARCEL) {
            baseFare = 30.0;
            perKmRate = 8.0;
        }

        return baseFare + (distance * perKmRate);
    }

    public Optional<Booking> getUserActiveBooking(Long userId) {
        List<BookingStatus> activeStatuses = List.of(
                BookingStatus.ACCEPTED, BookingStatus.RIDER_ARRIVED, BookingStatus.IN_PROGRESS);
        return bookingRepository.findByUserIdAndStatusIn(userId, activeStatuses)
                .stream()
                .findFirst();
    }

    public Optional<Booking> getRiderActiveBooking(Long userId) {
        Rider rider = riderService.getRiderByUserId(userId);
        List<BookingStatus> activeStatuses = List.of(
                BookingStatus.ACCEPTED, BookingStatus.RIDER_ARRIVED, BookingStatus.IN_PROGRESS);
        return bookingRepository.findByRiderIdAndStatusIn(rider.getId(), activeStatuses)
                .stream()
                .findFirst();
    }

    public long getTotalBookingsToday() {
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        LocalDateTime endOfDay = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59);
        return bookingRepository.countByCreatedAtBetween(startOfDay, endOfDay);
    }

    public long getBookingCountByStatus(BookingStatus status) {
        return bookingRepository.countByStatus(status);
    }

    @Transactional
    public Booking markRiderReached(Long bookingId, Long riderId) {
        Booking booking = getBookingById(bookingId);
        
        if (booking.getRider() == null || !booking.getRider().getUser().getId().equals(riderId)) {
            throw new RuntimeException("Unauthorized: This booking is not assigned to you");
        }
        
        if (booking.getStatus() != BookingStatus.ACCEPTED && booking.getStatus() != BookingStatus.RIDER_EN_ROUTE) {
            throw new RuntimeException("Invalid booking status for marking arrival");
        }
        
        String otp = booking.getUser().getFixedOtp();
        if (otp == null) {
            otp = String.format("%04d", (int)(Math.random() * 10000));
        }
        
        booking.setVerificationOtp(otp);
        booking.setStatus(BookingStatus.RIDER_ARRIVED);
        booking.setRiderArrivedAt(LocalDateTime.now());
        
        Booking savedBooking = bookingRepository.save(booking);
        log.info("Rider {} marked reached for booking {}. User fixed OTP: {}", riderId, bookingId, otp);
        
        notificationService.notifyUserWithType(
                booking.getUser().getId(),
                "Rider Arrived",
                "Your rider has arrived! Share your OTP: " + otp,
                "OTP_READY",
                booking.getId()
        );
        
        return savedBooking;
    }

    @Transactional
    public Booking verifyOtpAndStartRide(Long bookingId, Long riderId, String otp) {
        Booking booking = getBookingById(bookingId);
        
        if (booking.getRider() == null || !booking.getRider().getUser().getId().equals(riderId)) {
            throw new RuntimeException("Unauthorized: This booking is not assigned to you");
        }
        
        if (booking.getStatus() != BookingStatus.RIDER_ARRIVED) {
            throw new RuntimeException("Rider must mark arrival before starting ride");
        }
        
        if (booking.getVerificationOtp() == null || !booking.getVerificationOtp().equals(otp)) {
            throw new RuntimeException("Invalid OTP. Please try again.");
        }
        
        booking.setStatus(BookingStatus.IN_PROGRESS);
        booking.setStartedAt(LocalDateTime.now());
        booking.setVerificationOtp(null); // Clear OTP after verification
        
        Booking savedBooking = bookingRepository.save(booking);
        log.info("Ride started for booking {} after OTP verification", bookingId);
        
        notificationService.notifyUserWithType(
                booking.getUser().getId(),
                "Ride Started",
                "Your ride has started. Enjoy your journey!",
                "RIDE_STARTED",
                booking.getId()
        );
        
        return savedBooking;
    }

    @Transactional
    public Booking completeRide(Long bookingId, Long riderId) {
        Booking booking = getBookingById(bookingId);
        
        if (booking.getRider() == null || !booking.getRider().getUser().getId().equals(riderId)) {
            throw new RuntimeException("Unauthorized: This booking is not assigned to you");
        }
        
        if (booking.getStatus() != BookingStatus.IN_PROGRESS) {
            throw new RuntimeException("Ride must be in progress to complete");
        }
        
        booking.setStatus(BookingStatus.COMPLETED);
        booking.setCompletedAt(LocalDateTime.now());
        booking.setFinalFare(booking.getEstimatedFare());
        
        // Update rider statistics
        userService.incrementBookingCount(booking.getUser().getId());
        riderService.incrementRideCount(booking.getRider().getId());
        
        Booking savedBooking = bookingRepository.save(booking);
        log.info("Ride completed for booking {}", bookingId);
        
        notificationService.notifyUserWithType(
                booking.getUser().getId(),
                "Ride Completed",
                "Your ride is complete! Please rate your experience.",
                "RATE_RIDER",
                booking.getId()
        );
        riderService.updateRiderStatus(booking.getRider().getId(), com.flux.model.enums.RiderStatus.AVAILABLE);
        
        return savedBooking;
    }

    public List<Booking> getAllBookingsWithFilters(BookingStatus status, String search, String startDate, String endDate) {
        if (status != null) {
            return bookingRepository.findByStatus(status);
        }
        return bookingRepository.findAll();
    }
}

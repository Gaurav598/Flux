package com.flux.service;

import com.flux.dto.BookingRequest;
import com.flux.exception.ResourceNotFoundException;
import com.flux.model.entity.Booking;
import com.flux.model.entity.Bid;
import com.flux.model.entity.Rider;
import com.flux.model.entity.User;
import com.flux.model.enums.BookingStatus;
import com.flux.model.enums.BidStatus;
import com.flux.model.enums.AccountStatus;
import com.flux.model.enums.RiderStatus;
import com.flux.model.enums.ServiceType;
import com.flux.repository.BookingRepository;
import com.flux.repository.BidRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;
import java.util.Optional;
import java.security.SecureRandom;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingService {

    private static final List<BookingStatus> ACTIVE_STATUSES = List.of(
            BookingStatus.BIDDING, BookingStatus.ACCEPTED, BookingStatus.RIDER_EN_ROUTE,
            BookingStatus.RIDER_ARRIVED, BookingStatus.IN_PROGRESS);
    private static final int MAX_OTP_ATTEMPTS = 5;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final BookingRepository bookingRepository;
    private final BidRepository bidRepository;
    private final UserService userService;
    private final RiderService riderService;
    private final NotificationService notificationService;
    private final RealtimeEventService realtimeEventService;

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
        realtimeEventService.publishBookingAfterCommit(savedBooking);
        log.info("Booking created: {} for user: {}", savedBooking.getId(), userId);

        notificationService.notifyUser(userId, "Booking Confirmed", 
                "Your booking is confirmed! Finding riders...");

        return savedBooking;
    }

    @Transactional
    public Booking createBookingFromRequest(Long userId, BookingRequest req) {
        User user = userService.getUserById(userId);
        if (user.getStatus() != AccountStatus.ACTIVE) {
            throw new IllegalStateException("Only active accounts can create bookings");
        }
        if (!bookingRepository.findByUserIdAndStatusIn(userId, ACTIVE_STATUSES).isEmpty()) {
            throw new com.flux.exception.ConflictException("You already have an active booking");
        }
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
        realtimeEventService.publishBookingAfterCommit(savedBooking);
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

    public Booking getBookingForActor(Long bookingId, Long actorUserId, String actorRole) {
        Booking booking = getBookingById(bookingId);
        if ("ADMIN".equalsIgnoreCase(actorRole)
                || booking.getUser().getId().equals(actorUserId)
                || (booking.getRider() != null && booking.getRider().getUser().getId().equals(actorUserId))) {
            return booking;
        }
        throw new AccessDeniedException("You are not a participant in this booking");
    }

    public List<Booking> getUserBookings(Long userId) {
        return bookingRepository.findByUserId(userId);
    }

    public List<Booking> getRiderBookings(Long riderUserId) {
        Rider rider = riderService.getRiderByUserId(riderUserId);
        return bookingRepository.findByRiderId(rider.getId());
    }

    public Page<Booking> getUserBookingHistory(Long userId, int page, int size) {
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId, historyPage(page, size));
    }

    public Page<Booking> getRiderBookingHistory(Long riderUserId, int page, int size) {
        Rider rider = riderService.getRiderByUserId(riderUserId);
        return bookingRepository.findByRiderIdOrderByCreatedAtDesc(rider.getId(), historyPage(page, size));
    }

    public List<Booking> getActiveBookings() {
        return bookingRepository.findByStatusIn(List.of(
                BookingStatus.ACCEPTED,
                BookingStatus.RIDER_EN_ROUTE,
                BookingStatus.RIDER_ARRIVED,
                BookingStatus.IN_PROGRESS
        ));
    }

    public long getActiveBookingCount() {
        return bookingRepository.countByStatusIn(List.of(
                BookingStatus.ACCEPTED,
                BookingStatus.RIDER_EN_ROUTE,
                BookingStatus.RIDER_ARRIVED,
                BookingStatus.IN_PROGRESS
        ));
    }

    @Transactional
    public Booking acceptBid(Long bookingId, Long riderId) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        Rider rider = riderService.getRiderByIdWithLock(riderId);

        BookingStateMachine.requireTransition(booking.getStatus(), BookingStatus.ACCEPTED);
        requireBiddingOpen(booking);
        riderService.requireEligibleForTrips(rider);
        requireNoOtherActiveRide(riderId, bookingId);
        if (!vehicleTypesMatch(booking.getVehicleType(), rider.getVehicleType())) {
            throw new IllegalStateException("This booking requires a " + booking.getVehicleType() + " rider");
        }

        booking.setRider(rider);
        booking.setStatus(BookingStatus.ACCEPTED);
        booking.setAcceptedAt(LocalDateTime.now());

        Booking savedBooking = bookingRepository.save(booking);
        realtimeEventService.publishBookingAfterCommit(savedBooking);
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
    public Booking acceptUserPrice(Long bookingId, Long riderUserId) {
        // Re-fetch booking with a pessimistic write lock (SELECT FOR UPDATE) to prevent
        // two concurrent riders from simultaneously passing the BIDDING guard.
        Booking freshBooking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (freshBooking.getStatus() != BookingStatus.BIDDING) {
            throw new RuntimeException("This booking is no longer available — another rider may have already been selected.");
        }

        requireBiddingOpen(freshBooking);
        Rider actorRider = riderService.getRiderByUserId(riderUserId);
        Rider rider = riderService.getRiderByIdWithLock(actorRider.getId());
        riderService.requireEligibleForTrips(rider);
        requireNoOtherActiveRide(rider.getId(), bookingId);

        if (!vehicleTypesMatch(freshBooking.getVehicleType(), rider.getVehicleType())) {
            throw new RuntimeException("This booking requires a " + freshBooking.getVehicleType() + " rider");
        }

        Double agreedFare = freshBooking.getUserEnteredAmount() != null ? freshBooking.getUserEnteredAmount() : freshBooking.getEstimatedFare();

        freshBooking.setRider(rider);
        freshBooking.setStatus(BookingStatus.ACCEPTED);
        freshBooking.setAcceptedAt(LocalDateTime.now());
        freshBooking.setFinalFare(agreedFare);

        Booking savedBooking = bookingRepository.save(freshBooking);
        realtimeEventService.publishBookingAfterCommit(savedBooking);
        riderService.updateRiderStatus(rider.getId(), RiderStatus.ON_RIDE);
        rejectPendingBids(bookingId, null, "This booking was accepted directly by another rider");

        log.info("Booking {} accepted at user price {} by rider {}", bookingId, agreedFare, rider.getId());

        notificationService.notifyUserWithType(
                savedBooking.getUser().getId(),
                "Rider Found",
                "Rider " + rider.getUser().getFullName() + " accepted your price and is on the way!",
                "RIDER_APPROACHING",
                savedBooking.getId()
        );
        
        notificationService.notifyRiderWithType(
                rider.getId(),
                "Booking Confirmed",
                "Navigate to pickup location",
                "RIDE_ACCEPTED",
                savedBooking.getId()
        );

        return savedBooking;
    }

    @Transactional
    public Booking updateBookingStatus(Long bookingId, BookingStatus status) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        if (booking.getStatus() == status) {
            return booking;
        }
        BookingStateMachine.requireTransition(booking.getStatus(), status);
        booking.setStatus(status);

        if (status == BookingStatus.RIDER_EN_ROUTE) {
            booking.setRiderEnRouteAt(LocalDateTime.now());
        } else if (status == BookingStatus.RIDER_ARRIVED) {
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
            riderService.updateRiderStatus(booking.getRider().getId(), RiderStatus.AVAILABLE);
            notificationService.notifyUserWithType(
                    booking.getUser().getId(),
                    "Ride Completed",
                    "Please rate your rider",
                    "RATE_RIDER",
                    booking.getId()
            );
        }

        Booking savedBooking = bookingRepository.save(booking);
        realtimeEventService.publishBookingAfterCommit(savedBooking);
        log.info("Booking {} status updated to {}", bookingId, status);
        return savedBooking;
    }

    @Transactional
    public Booking updateBookingStatusAsActor(Long bookingId, BookingStatus status, String actorRole) {
        if (!"ADMIN".equalsIgnoreCase(actorRole)) {
            throw new AccessDeniedException("Only administrators can perform manual status updates");
        }
        return updateBookingStatus(bookingId, status);
    }

    @Transactional
    public Booking markRiderEnRoute(Long bookingId, Long riderUserId) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        Rider rider = riderService.getRiderByUserId(riderUserId);
        if (booking.getRider() == null || !booking.getRider().getId().equals(rider.getId())) {
            throw new AccessDeniedException("Only the assigned rider can start navigation");
        }
        if (booking.getStatus() == BookingStatus.RIDER_EN_ROUTE) {
            return booking;
        }
        BookingStateMachine.requireTransition(booking.getStatus(), BookingStatus.RIDER_EN_ROUTE);
        booking.setStatus(BookingStatus.RIDER_EN_ROUTE);
        booking.setRiderEnRouteAt(LocalDateTime.now());
        Booking saved = bookingRepository.save(booking);
        realtimeEventService.publishBookingAfterCommit(saved);
        notificationService.notifyUserWithType(
                booking.getUser().getId(),
                "Rider En Route",
                "Your rider has started navigation to the pickup location",
                "RIDER_EN_ROUTE",
                booking.getId()
        );
        return saved;
    }

    @Transactional
    public Booking cancelBooking(Long bookingId, String reason, boolean byUser) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        BookingStatus target = byUser ? BookingStatus.CANCELLED_BY_USER : BookingStatus.CANCELLED_BY_RIDER;
        if (booking.getStatus() == target) {
            return booking;
        }
        BookingStateMachine.requireTransition(booking.getStatus(), target);

        booking.setStatus(target);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancellationReason(reason);

        if (!byUser && booking.getRider() != null) {
            riderService.incrementCancellationCount(booking.getRider().getId());
        }

        Booking savedBooking = bookingRepository.save(booking);
        realtimeEventService.publishBookingAfterCommit(savedBooking);
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
                    "Your booking was cancelled by the rider.",
                    "BOOKING_CANCELLED",
                    booking.getId()
            );
            if (booking.getRider() != null) {
                riderService.updateRiderStatus(booking.getRider().getId(), com.flux.model.enums.RiderStatus.AVAILABLE);
            }
        }

        rejectPendingBids(bookingId, null, "This booking was cancelled");

        return savedBooking;
    }

    @Transactional
    public Booking cancelBookingAsActor(Long bookingId, String reason, Long actorUserId, String actorRole) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        boolean owner = booking.getUser().getId().equals(actorUserId);
        boolean assignedRider = booking.getRider() != null
                && booking.getRider().getUser().getId().equals(actorUserId);
        if (!owner && !assignedRider && !"ADMIN".equalsIgnoreCase(actorRole)) {
            throw new AccessDeniedException("Only the booking owner or assigned rider can cancel");
        }
        boolean byUser = owner || ("ADMIN".equalsIgnoreCase(actorRole) && !assignedRider);
        BookingStatus target = byUser ? BookingStatus.CANCELLED_BY_USER : BookingStatus.CANCELLED_BY_RIDER;
        BookingStateMachine.requireTransition(booking.getStatus(), target);
        if (reason == null || reason.isBlank() || reason.length() > 500) {
            throw new IllegalArgumentException("A cancellation reason of 1-500 characters is required");
        }
        return cancelBooking(bookingId, reason.trim(), byUser);
    }

    @Transactional
    public Booking rateBookingAsActor(Long bookingId, Long actorUserId, Integer userRating,
                                      String userReview, Integer riderRating, String riderReview) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new IllegalStateException("Only completed bookings can be rated");
        }
        boolean bookingOwner = booking.getUser().getId().equals(actorUserId);
        boolean assignedRider = booking.getRider() != null
                && booking.getRider().getUser().getId().equals(actorUserId);
        if (!bookingOwner && !assignedRider) {
            throw new AccessDeniedException("Only booking participants can submit a rating");
        }
        if (bookingOwner) {
            if (userRating == null || riderRating != null) {
                throw new IllegalArgumentException("The booking owner must provide userRating only");
            }
            validateRating(userRating);
            if (booking.getUserRating() != null) {
                throw new com.flux.exception.ConflictException("This rider has already been rated");
            }
            booking.setUserRating(userRating);
            booking.setUserReview(normalizeReview(userReview));
            riderService.updateRiderRating(booking.getRider().getId(), userRating);
        } else {
            if (riderRating == null || userRating != null) {
                throw new IllegalArgumentException("The assigned rider must provide riderRating only");
            }
            validateRating(riderRating);
            if (booking.getRiderRating() != null) {
                throw new com.flux.exception.ConflictException("This user has already been rated");
            }
            booking.setRiderRating(riderRating);
            booking.setRiderReview(normalizeReview(riderReview));
            userService.updateAverageRating(booking.getUser().getId(), riderRating.doubleValue(), false);
        }
        return bookingRepository.save(booking);
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
                .filter(this::isBiddingOpen)
                .filter(booking -> rider == null || vehicleTypesMatch(booking.getVehicleType(), rider.getVehicleType()))
                .filter(booking -> rider == null
                        || !bidRepository.existsByBookingIdAndRiderId(booking.getId(), rider.getId()))
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
                BookingStatus.BIDDING, BookingStatus.ACCEPTED, BookingStatus.RIDER_EN_ROUTE,
                BookingStatus.RIDER_ARRIVED, BookingStatus.IN_PROGRESS);
        return bookingRepository.findFirstByUserIdAndStatusInOrderByUpdatedAtDesc(userId, activeStatuses);
    }

    public Optional<Booking> getRiderActiveBooking(Long userId) {
        Rider rider = riderService.getRiderByUserId(userId);
        List<BookingStatus> activeStatuses = List.of(
                BookingStatus.ACCEPTED, BookingStatus.RIDER_EN_ROUTE,
                BookingStatus.RIDER_ARRIVED, BookingStatus.IN_PROGRESS);
        return bookingRepository.findFirstByRiderIdAndStatusInOrderByUpdatedAtDesc(rider.getId(), activeStatuses);
    }

    public long getTotalBookingsToday() {
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        LocalDateTime endOfDay = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59);
        return bookingRepository.countByCreatedAtBetween(startOfDay, endOfDay);
    }

    public long getBookingCountByStatus(BookingStatus status) {
        return bookingRepository.countByStatus(status);
    }

    public Double getTotalRevenueToday() {
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        LocalDateTime endOfDay = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59);
        return bookingRepository.sumCompanyCommissionBetween(startOfDay, endOfDay);
    }

    public Double getTotalRevenue() {
        LocalDateTime startOfTime = LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime endOfDay = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59);
        return bookingRepository.sumCompanyCommissionBetween(startOfTime, endOfDay);
    }

    public long getTotalBookingCount() {
        return bookingRepository.count();
    }

    public List<Map<String, Object>> getDailyBookingCounts(int requestedDays) {
        int days = Math.max(1, Math.min(requestedDays, 31));
        LocalDate today = LocalDate.now();
        LocalDate firstDay = today.minusDays(days - 1L);
        Map<LocalDate, Long> counts = new LinkedHashMap<>();
        for (int offset = 0; offset < days; offset++) {
            counts.put(firstDay.plusDays(offset), 0L);
        }
        bookingRepository.findByCreatedAtBetween(firstDay.atStartOfDay(), today.plusDays(1).atStartOfDay())
                .forEach(booking -> {
                    if (booking.getCreatedAt() != null) {
                        LocalDate date = booking.getCreatedAt().toLocalDate();
                        counts.computeIfPresent(date, (ignored, count) -> count + 1);
                    }
                });
        List<Map<String, Object>> result = new ArrayList<>();
        counts.forEach((date, count) -> result.add(Map.of("date", date.toString(), "bookings", count)));
        return result;
    }

    @Transactional
    public Booking markRiderReached(Long bookingId, Long riderId) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        
        if (booking.getRider() == null || !booking.getRider().getUser().getId().equals(riderId)) {
            throw new RuntimeException("Unauthorized: This booking is not assigned to you");
        }
        
        boolean expiredOtpCanBeReissued = booking.getStatus() == BookingStatus.RIDER_ARRIVED
                && (booking.getVerificationOtpExpiresAt() == null
                || LocalDateTime.now().isAfter(booking.getVerificationOtpExpiresAt()));
        if (booking.getStatus() != BookingStatus.ACCEPTED
                && booking.getStatus() != BookingStatus.RIDER_EN_ROUTE
                && !expiredOtpCanBeReissued) {
            throw new RuntimeException("Invalid booking status for marking arrival");
        }
        BookingStateMachine.requireTransition(booking.getStatus(), BookingStatus.RIDER_ARRIVED);
        
        String otp = issueVerificationOtp(booking);
        booking.setStatus(BookingStatus.RIDER_ARRIVED);
        booking.setRiderArrivedAt(LocalDateTime.now());
        
        Booking savedBooking = bookingRepository.save(booking);
        realtimeEventService.publishBookingAfterCommit(savedBooking);
        log.info("Rider {} marked reached for booking {}", riderId, bookingId);
        
        notificationService.notifyUserWithType(
                booking.getUser().getId(),
                "Rider Arrived",
                "Your rider has arrived! Share your OTP: " + otp,
                "OTP_READY",
                booking.getId()
        );
        
        return savedBooking;
    }

    @Transactional(noRollbackFor = {
            com.flux.exception.InvalidOtpException.class,
            com.flux.exception.OtpExpiredException.class
    })
    public Booking verifyOtpAndStartRide(Long bookingId, Long riderId, String otp) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        
        if (booking.getRider() == null || !booking.getRider().getUser().getId().equals(riderId)) {
            throw new RuntimeException("Unauthorized: This booking is not assigned to you");
        }
        
        if (booking.getStatus() != BookingStatus.RIDER_ARRIVED) {
            throw new RuntimeException("Rider must mark arrival before starting ride");
        }
        
        if (booking.getVerificationOtpExpiresAt() == null
                || LocalDateTime.now().isAfter(booking.getVerificationOtpExpiresAt())) {
            clearVerificationOtp(booking);
            bookingRepository.save(booking);
            throw new com.flux.exception.OtpExpiredException(
                    "OTP has expired. Mark arrival again to issue a new OTP.");
        }
        if (booking.getVerificationOtpAttempts() != null
                && booking.getVerificationOtpAttempts() >= MAX_OTP_ATTEMPTS) {
            throw new IllegalStateException("Too many invalid OTP attempts");
        }
        if (otp == null || booking.getVerificationOtp() == null || !booking.getVerificationOtp().equals(otp)) {
            int attempts = booking.getVerificationOtpAttempts() == null ? 0 : booking.getVerificationOtpAttempts();
            booking.setVerificationOtpAttempts(attempts + 1);
            bookingRepository.save(booking);
            throw new com.flux.exception.InvalidOtpException("Invalid OTP. Please try again.");
        }
        BookingStateMachine.requireTransition(booking.getStatus(), BookingStatus.IN_PROGRESS);
        booking.setStatus(BookingStatus.IN_PROGRESS);
        booking.setStartedAt(LocalDateTime.now());
        clearVerificationOtp(booking);
        
        Booking savedBooking = bookingRepository.save(booking);
        realtimeEventService.publishBookingAfterCommit(savedBooking);
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
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        
        if (booking.getRider() == null || !booking.getRider().getUser().getId().equals(riderId)) {
            throw new RuntimeException("Unauthorized: This booking is not assigned to you");
        }
        
        if (booking.getStatus() != BookingStatus.IN_PROGRESS) {
            throw new RuntimeException("Ride must be in progress to complete");
        }
        
        BookingStateMachine.requireTransition(booking.getStatus(), BookingStatus.COMPLETED);
        booking.setStatus(BookingStatus.COMPLETED);
        booking.setCompletedAt(LocalDateTime.now());
        
        // Flux uses rider subscriptions rather than per-ride commission. The
        // agreed customer fare is therefore the rider's full gross/net earning.
        if (booking.getFinalFare() != null) {
            java.math.BigDecimal fare = java.math.BigDecimal.valueOf(booking.getFinalFare());
            java.math.BigDecimal normalizedFare = fare.setScale(2, java.math.RoundingMode.HALF_UP);
            booking.setCompanyCommission(0.0);
            booking.setRiderEarning(normalizedFare.doubleValue());
        }
        
        // Update rider statistics
        userService.incrementBookingCount(booking.getUser().getId());
        riderService.incrementRideCount(booking.getRider().getId());
        
        Booking savedBooking = bookingRepository.save(booking);
        realtimeEventService.publishBookingAfterCommit(savedBooking);
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

    public List<Map<String, Object>> getTimeline(Long bookingId, Long actorUserId, String actorRole) {
        Booking booking = getBookingForActor(bookingId, actorUserId, actorRole);
        List<Map<String, Object>> timeline = new ArrayList<>();
        addTimelineEvent(timeline, "BOOKING_CREATED", "Booking created", booking.getCreatedAt());
        addTimelineEvent(timeline, "BIDDING_STARTED", "Bidding started", booking.getBiddingStartTime());
        addTimelineEvent(timeline, "RIDER_ASSIGNED", "Rider assigned", booking.getAcceptedAt());
        addTimelineEvent(timeline, "RIDER_EN_ROUTE", "Rider en route", booking.getRiderEnRouteAt());
        addTimelineEvent(timeline, "RIDER_ARRIVED", "Rider arrived", booking.getRiderArrivedAt());
        addTimelineEvent(timeline, "TRIP_STARTED", "Trip started", booking.getStartedAt());
        addTimelineEvent(timeline, "TRIP_COMPLETED", "Trip completed", booking.getCompletedAt());
        if (booking.getCancelledAt() != null) {
            Map<String, Object> event = timelineEvent("BOOKING_CANCELLED", "Booking cancelled", booking.getCancelledAt());
            event.put("reason", booking.getCancellationReason());
            event.put("status", booking.getStatus().name());
            timeline.add(event);
        }
        timeline.sort((left, right) -> ((LocalDateTime) left.get("occurredAt"))
                .compareTo((LocalDateTime) right.get("occurredAt")));
        return timeline;
    }

    public Map<String, Object> getRiderLocationForActor(Long bookingId, Long actorUserId, String actorRole) {
        Booking booking = getBookingForActor(bookingId, actorUserId, actorRole);
        if (booking.getRider() == null) {
            throw new IllegalStateException("No rider is assigned to this booking");
        }
        Rider rider = booking.getRider();
        LocalDateTime recordedAt = rider.getLastLocationUpdate();
        long ageSeconds = recordedAt == null ? Long.MAX_VALUE
                : Math.max(0, Duration.between(recordedAt, LocalDateTime.now()).getSeconds());
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("bookingId", bookingId);
        response.put("riderId", rider.getId());
        response.put("latitude", rider.getCurrentLatitude());
        response.put("longitude", rider.getCurrentLongitude());
        response.put("recordedAt", recordedAt);
        response.put("ageSeconds", ageSeconds == Long.MAX_VALUE ? null : ageSeconds);
        response.put("fresh", ageSeconds <= 30);
        return response;
    }

    private PageRequest historyPage(int page, int size) {
        if (page < 0) throw new IllegalArgumentException("page must be zero or greater");
        int boundedSize = Math.max(1, Math.min(size, 50));
        return PageRequest.of(page, boundedSize, Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    private void addTimelineEvent(List<Map<String, Object>> timeline, String type,
                                  String label, LocalDateTime occurredAt) {
        if (occurredAt != null) timeline.add(timelineEvent(type, label, occurredAt));
    }

    private Map<String, Object> timelineEvent(String type, String label, LocalDateTime occurredAt) {
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("type", type);
        event.put("label", label);
        event.put("occurredAt", occurredAt);
        return event;
    }

    public String getVerificationOtpForOwner(Long bookingId, Long actorUserId) {
        Booking booking = getBookingById(bookingId);
        if (!booking.getUser().getId().equals(actorUserId)) {
            throw new AccessDeniedException("Only the booking owner can view the verification OTP");
        }
        if (booking.getStatus() != BookingStatus.RIDER_ARRIVED
                || booking.getVerificationOtp() == null
                || booking.getVerificationOtpExpiresAt() == null
                || LocalDateTime.now().isAfter(booking.getVerificationOtpExpiresAt())) {
            throw new IllegalStateException("No active verification OTP is available");
        }
        return booking.getVerificationOtp();
    }

    private void requireBiddingOpen(Booking booking) {
        if (!isBiddingOpen(booking)) {
            throw new IllegalStateException("The bidding window has expired");
        }
    }

    private boolean isBiddingOpen(Booking booking) {
        return booking.getStatus() == BookingStatus.BIDDING
                && booking.getBiddingEndTime() != null
                && LocalDateTime.now().isBefore(booking.getBiddingEndTime());
    }

    private void requireNoOtherActiveRide(Long riderId, Long bookingId) {
        List<BookingStatus> statuses = List.of(BookingStatus.ACCEPTED, BookingStatus.RIDER_EN_ROUTE,
                BookingStatus.RIDER_ARRIVED, BookingStatus.IN_PROGRESS);
        boolean conflict = bookingRepository.findByRiderIdAndStatusIn(riderId, statuses).stream()
                .anyMatch(other -> !other.getId().equals(bookingId));
        if (conflict) {
            throw new com.flux.exception.ConflictException("Rider already has an active ride");
        }
    }

    private String issueVerificationOtp(Booking booking) {
        String otp = String.format("%04d", SECURE_RANDOM.nextInt(10_000));
        booking.setVerificationOtp(otp);
        booking.setVerificationOtpExpiresAt(LocalDateTime.now().plusMinutes(10));
        booking.setVerificationOtpAttempts(0);
        return otp;
    }

    private void clearVerificationOtp(Booking booking) {
        booking.setVerificationOtp(null);
        booking.setVerificationOtpExpiresAt(null);
        booking.setVerificationOtpAttempts(0);
    }

    private void rejectPendingBids(Long bookingId, Long acceptedBidId, String message) {
        List<Bid> pendingBids = bidRepository.findByBookingIdAndStatus(bookingId, BidStatus.PENDING);
        for (Bid pendingBid : pendingBids) {
            if (acceptedBidId != null && acceptedBidId.equals(pendingBid.getId())) {
                continue;
            }
            pendingBid.setStatus(BidStatus.REJECTED);
            bidRepository.save(pendingBid);
            notificationService.notifyRiderWithType(
                    pendingBid.getRider().getId(),
                    "Booking Unavailable",
                    message,
                    "BOOKING_CANCELLED",
                    bookingId
            );
        }
    }

    private void validateRating(Integer rating) {
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }
    }

    private String normalizeReview(String review) {
        if (review == null) {
            return null;
        }
        String normalized = review.trim();
        if (normalized.length() > 1000) {
            throw new IllegalArgumentException("Review must not exceed 1000 characters");
        }
        return normalized;
    }

    public List<Booking> getAllBookingsWithFilters(BookingStatus status, String search, String startDate, String endDate) {
        if (status != null) {
            return bookingRepository.findByStatus(status);
        }
        return bookingRepository.findAll();
    }
}

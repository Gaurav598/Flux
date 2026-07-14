package com.flux.service;

import com.flux.model.entity.Booking;
import com.flux.model.entity.Rider;
import com.flux.model.entity.User;
import com.flux.model.enums.BookingStatus;
import com.flux.model.enums.RiderStatus;
import com.flux.repository.BookingRepository;
import com.flux.repository.RiderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class RiderService {

    private final RiderRepository riderRepository;
    private final UserService userService;
    private final BookingRepository bookingRepository;

    /**
     * Get existing rider profile or create a basic one for a user.
     * This ensures every rider user has a rider profile entry.
     */
    @Transactional
    public Rider getOrCreateRiderForUser(Long userId) {
        try {
            return getRiderByUserId(userId);
        } catch (RuntimeException e) {
            // Create a basic rider profile
            User user = userService.getUserById(userId);
            Rider rider = Rider.builder()
                    .user(user)
                    .status(RiderStatus.ACTIVE) // Default to active for now
                    .vehicleType("Auto") // Default vehicle type
                    .averageRating(5.0)
                    .totalRides(0)
                    .totalRatings(0)
                    .cancellationCount(0)
                    .acceptanceRate(100.0)
                    .build();
            Rider savedRider = riderRepository.save(rider);
            log.info("Auto-created rider profile for user: {}", userId);
            return savedRider;
        }
    }

    @Transactional
    public Rider createRiderApplication(User user, Rider riderData) {
        Rider rider = Rider.builder()
                .user(user)
                .dateOfBirth(riderData.getDateOfBirth())
                .gender(riderData.getGender())
                .homeAddress(riderData.getHomeAddress())
                .vehicleType(riderData.getVehicleType())
                .vehicleMake(riderData.getVehicleMake())
                .vehicleModel(riderData.getVehicleModel())
                .vehicleYear(riderData.getVehicleYear())
                .vehicleRegistrationNumber(riderData.getVehicleRegistrationNumber())
                .vehicleColor(riderData.getVehicleColor())
                .bankAccountNumber(riderData.getBankAccountNumber())
                .bankIfscCode(riderData.getBankIfscCode())
                .bankAccountHolderName(riderData.getBankAccountHolderName())
                .status(RiderStatus.PENDING)
                .build();

        Rider savedRider = riderRepository.save(rider);
        log.info("Rider application created for user: {}", user.getId());
        return savedRider;
    }

    public Rider getRiderById(Long riderId) {
        return riderRepository.findById(riderId)
                .orElseThrow(() -> new RuntimeException("Rider not found"));
    }

    public Rider getRiderByUserId(Long userId) {
        return riderRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Rider not found for this user"));
    }

    @Transactional
    public Rider updateBasicProfile(Long riderId, String vehicleModel, String vehicleRegistrationNumber, String vehicleType) {
        Rider rider = getRiderById(riderId);
        if (vehicleModel != null && !vehicleModel.isBlank()) {
            rider.setVehicleModel(vehicleModel.trim());
        }
        if (vehicleRegistrationNumber != null && !vehicleRegistrationNumber.isBlank()) {
            rider.setVehicleRegistrationNumber(vehicleRegistrationNumber.trim());
        }
        if (vehicleType != null && !vehicleType.isBlank()) {
            rider.setVehicleType(vehicleType.trim());
        }
        return riderRepository.save(rider);
    }

    @Transactional
    public Rider updateRiderDocuments(Long riderId, Rider documentUrls) {
        Rider rider = getRiderById(riderId);
        
        if (documentUrls.getDrivingLicenseUrl() != null) {
            rider.setDrivingLicenseUrl(documentUrls.getDrivingLicenseUrl());
        }
        if (documentUrls.getAadharCardUrl() != null) {
            rider.setAadharCardUrl(documentUrls.getAadharCardUrl());
        }
        if (documentUrls.getPanCardUrl() != null) {
            rider.setPanCardUrl(documentUrls.getPanCardUrl());
        }
        if (documentUrls.getVehicleRcUrl() != null) {
            rider.setVehicleRcUrl(documentUrls.getVehicleRcUrl());
        }
        if (documentUrls.getVehicleInsuranceUrl() != null) {
            rider.setVehicleInsuranceUrl(documentUrls.getVehicleInsuranceUrl());
        }
        if (documentUrls.getVehiclePucUrl() != null) {
            rider.setVehiclePucUrl(documentUrls.getVehiclePucUrl());
        }
        if (documentUrls.getVehiclePhotoUrl() != null) {
            rider.setVehiclePhotoUrl(documentUrls.getVehiclePhotoUrl());
        }
        if (documentUrls.getSelfieWithVehicleUrl() != null) {
            rider.setSelfieWithVehicleUrl(documentUrls.getSelfieWithVehicleUrl());
        }

        return riderRepository.save(rider);
    }

    @Transactional
    public Rider approveRider(Long riderId) {
        Rider rider = getRiderById(riderId);
        rider.setStatus(RiderStatus.APPROVED);
        Rider savedRider = riderRepository.save(rider);
        log.info("Rider approved: {}", riderId);
        return savedRider;
    }

    @Transactional
    public Rider rejectRider(Long riderId, String reason) {
        Rider rider = getRiderById(riderId);
        rider.setStatus(RiderStatus.BANNED);
        rider.setRejectionReason(reason);
        Rider savedRider = riderRepository.save(rider);
        log.info("Rider rejected: {} with reason: {}", riderId, reason);
        return savedRider;
    }

    @Transactional
    public Rider activateSubscription(Long riderId, LocalDateTime startDate, LocalDateTime endDate) {
        Rider rider = getRiderById(riderId);
        rider.setSubscriptionStartDate(startDate);
        rider.setSubscriptionEndDate(endDate);
        rider.setSubscriptionActive(true);
        rider.setStatus(RiderStatus.ACTIVE);
        Rider savedRider = riderRepository.save(rider);
        log.info("Subscription activated for rider: {}", riderId);
        return savedRider;
    }

    @Transactional
    public void deactivateSubscription(Long riderId) {
        Rider rider = getRiderById(riderId);
        rider.setSubscriptionActive(false);
        rider.setStatus(RiderStatus.INACTIVE);
        riderRepository.save(rider);
        log.info("Subscription deactivated for rider: {}", riderId);
    }

    @Transactional
    public void updateRiderLocation(Long riderId, Double latitude, Double longitude) {
        Rider rider = getRiderById(riderId);
        rider.setCurrentLatitude(latitude);
        rider.setCurrentLongitude(longitude);
        rider.setLastLocationUpdate(LocalDateTime.now());
        riderRepository.save(rider);
    }

    @Transactional
    public void updateRiderStatus(Long riderId, RiderStatus status) {
        Rider rider = getRiderById(riderId);
        rider.setStatus(status);
        riderRepository.save(rider);
        log.info("Rider {} status updated to: {}", riderId, status);
    }

    @Transactional
    public void incrementRideCount(Long riderId) {
        Rider rider = getRiderById(riderId);
        rider.setTotalRides(rider.getTotalRides() + 1);
        riderRepository.save(rider);
    }

    @Transactional
    public void updateRiderRating(Long riderId, Integer newRating) {
        Rider rider = getRiderById(riderId);
        int totalRatings = rider.getTotalRatings();
        double currentAvg = rider.getAverageRating();
        
        double newAvg = ((currentAvg * totalRatings) + newRating) / (totalRatings + 1);
        rider.setAverageRating(newAvg);
        rider.setTotalRatings(totalRatings + 1);
        
        riderRepository.save(rider);
        log.info("Rider {} rating updated to: {}", riderId, newAvg);
    }

    @Transactional
    public void incrementCancellationCount(Long riderId) {
        Rider rider = getRiderById(riderId);
        rider.setCancellationCount(rider.getCancellationCount() + 1);
        
        int totalRides = rider.getTotalRides();
        int cancellations = rider.getCancellationCount();
        double acceptanceRate = totalRides == 0 ? 100.0 : ((double) (totalRides - cancellations) / totalRides) * 100;
        rider.setAcceptanceRate(acceptanceRate);
        
        riderRepository.save(rider);
    }

    public Map<String, Object> getRiderStats(Long riderId) {
        Rider rider = getRiderById(riderId);
        List<Booking> completedBookings = bookingRepository.findByRiderIdAndStatus(riderId, BookingStatus.COMPLETED);
        
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime startOfWeek = LocalDate.now().minusWeeks(1).atStartOfDay();
        LocalDateTime startOfMonth = LocalDate.now().minusMonths(1).atStartOfDay();

        double earningsToday = completedBookings.stream()
                .filter(b -> b.getUpdatedAt().isAfter(startOfDay))
                .mapToDouble(b -> b.getFinalFare() != null ? b.getFinalFare() : 0.0)
                .sum();

        double earningsWeek = completedBookings.stream()
                .filter(b -> b.getUpdatedAt().isAfter(startOfWeek))
                .mapToDouble(b -> b.getFinalFare() != null ? b.getFinalFare() : 0.0)
                .sum();

        double earningsMonth = completedBookings.stream()
                .filter(b -> b.getUpdatedAt().isAfter(startOfMonth))
                .mapToDouble(b -> b.getFinalFare() != null ? b.getFinalFare() : 0.0)
                .sum();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRides", rider.getTotalRides());
        stats.put("averageRating", rider.getAverageRating());
        stats.put("acceptanceRate", rider.getAcceptanceRate());
        stats.put("earningsToday", earningsToday);
        stats.put("earningsWeek", earningsWeek);
        stats.put("earningsMonth", earningsMonth);
        
        return stats;
    }

    public List<Map<String, Object>> getRiderTransactions(Long riderId) {
        List<Booking> completedBookings = bookingRepository.findByRiderIdAndStatus(riderId, BookingStatus.COMPLETED);
        
        return completedBookings.stream()
                .map(booking -> {
                    Map<String, Object> transaction = new HashMap<>();
                    transaction.put("id", booking.getId());
                    transaction.put("bookingId", booking.getId());
                    transaction.put("type", "credit");
                    transaction.put("amount", booking.getFinalFare() != null ? booking.getFinalFare() : 0.0);
                    transaction.put("title", "Ride Earning");
                    transaction.put("description", booking.getServiceType() + " - " + booking.getPickupAddress());
                    transaction.put("subtitle", "Booking #" + booking.getId());
                    transaction.put("createdAt", booking.getCompletedAt() != null ? booking.getCompletedAt() : booking.getUpdatedAt());
                    return transaction;
                })
                .sorted((a, b) -> ((LocalDateTime) b.get("createdAt")).compareTo((LocalDateTime) a.get("createdAt")))
                .limit(20)
                .toList();
    }

    public List<Rider> getPendingRiders() {
        return riderRepository.findByStatus(RiderStatus.PENDING);
    }

    public List<Rider> getActiveRiders() {
        return riderRepository.findByStatus(RiderStatus.ACTIVE);
    }

    public List<Rider> getNearbyAvailableRiders(Double latitude, Double longitude, Double radiusKm) {
        return riderRepository.findNearbyAvailableRiders(latitude, longitude, radiusKm, RiderStatus.AVAILABLE);
    }

    public List<Rider> getNearbyAvailableRidersByVehicleType(Double latitude, Double longitude, Double radiusKm, String vehicleType) {
        return riderRepository.findNearbyAvailableRidersByVehicleType(latitude, longitude, radiusKm, RiderStatus.AVAILABLE, vehicleType);
    }

    public long getRiderCountByStatus(RiderStatus status) {
        return riderRepository.countByStatus(status);
    }

    public List<Rider> getAllRidersWithFilters(RiderStatus status, String search, String location) {
        if (status != null) {
            return riderRepository.findByStatus(status);
        }
        return riderRepository.findAll();
    }

    @Transactional
    public Rider suspendRider(Long riderId, String reason) {
        Rider rider = getRiderById(riderId);
        rider.setStatus(RiderStatus.SUSPENDED);
        rider.setSuspensionReason(reason);
        Rider saved = riderRepository.save(rider);
        log.info("Rider {} suspended. Reason: {}", riderId, reason);
        return saved;
    }

    @Transactional
    public Rider activateRider(Long riderId) {
        Rider rider = getRiderById(riderId);
        rider.setStatus(RiderStatus.ACTIVE);
        rider.setSuspensionReason(null);
        Rider saved = riderRepository.save(rider);
        log.info("Rider {} activated", riderId);
        return saved;
    }
}

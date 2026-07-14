package com.flux.repository;

import com.flux.model.entity.Rider;
import com.flux.model.enums.RiderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RiderRepository extends JpaRepository<Rider, Long> {
    Optional<Rider> findByUserId(Long userId);
    List<Rider> findByStatus(RiderStatus status);
    long countByStatus(RiderStatus status);
    
    @Query("SELECT r FROM Rider r WHERE r.status = :status AND " +
           "r.currentLatitude IS NOT NULL AND r.currentLongitude IS NOT NULL AND " +
           "(6371 * acos(cos(radians(:latitude)) * cos(radians(r.currentLatitude)) * " +
           "cos(radians(r.currentLongitude) - radians(:longitude)) + " +
           "sin(radians(:latitude)) * sin(radians(r.currentLatitude)))) <= :radiusKm")
    List<Rider> findNearbyAvailableRiders(@Param("latitude") Double latitude,
                                           @Param("longitude") Double longitude,
                                           @Param("radiusKm") Double radiusKm,
                                           @Param("status") RiderStatus status);

    @Query("SELECT r FROM Rider r WHERE r.status = :status AND " +
           "r.vehicleType = :vehicleType AND " +
           "r.currentLatitude IS NOT NULL AND r.currentLongitude IS NOT NULL AND " +
           "(6371 * acos(cos(radians(:latitude)) * cos(radians(r.currentLatitude)) * " +
           "cos(radians(r.currentLongitude) - radians(:longitude)) + " +
           "sin(radians(:latitude)) * sin(radians(r.currentLatitude)))) <= :radiusKm")
    List<Rider> findNearbyAvailableRidersByVehicleType(@Param("latitude") Double latitude,
                                                        @Param("longitude") Double longitude,
                                                        @Param("radiusKm") Double radiusKm,
                                                        @Param("status") RiderStatus status,
                                                        @Param("vehicleType") String vehicleType);
}

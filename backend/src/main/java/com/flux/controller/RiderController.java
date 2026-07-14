package com.flux.controller;

import com.flux.model.entity.Bid;
import com.flux.model.entity.Rider;
import com.flux.model.entity.User;
import com.flux.model.enums.RiderStatus;
import com.flux.service.BiddingService;
import com.flux.service.RiderService;
import com.flux.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/rider")
@RequiredArgsConstructor
public class RiderController {

    private final RiderService riderService;
    private final UserService userService;
    private final BiddingService biddingService;

    @PostMapping("/apply")
    public ResponseEntity<?> applyAsRider(@RequestBody Rider riderData, HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            User user = userService.getUserById(userId);
            Rider rider = riderService.createRiderApplication(user, riderData);
            return ResponseEntity.ok(rider);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getRiderProfile(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            Rider rider = riderService.getRiderByUserId(userId);
            return ResponseEntity.ok(rider);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/documents")
    public ResponseEntity<?> updateDocuments(@RequestBody Rider documentUrls, HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            Rider rider = riderService.getRiderByUserId(userId);
            Rider updatedRider = riderService.updateRiderDocuments(rider.getId(), documentUrls);
            return ResponseEntity.ok(updatedRider);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/profile")
    public ResponseEntity<?> updateRiderProfile(@RequestBody Map<String, String> body, HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            Rider rider = riderService.getOrCreateRiderForUser(userId);

            User updateUser = new User();
            updateUser.setFullName(body.get("fullName"));
            userService.updateUser(userId, updateUser);

            Rider updated = riderService.updateBasicProfile(
                    rider.getId(),
                    body.get("vehicleModel"),
                    body.get("vehicleRegistrationNumber"),
                    body.get("vehicleType")
            );
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/location")
    public ResponseEntity<?> updateLocation(@RequestParam Double latitude, 
                                            @RequestParam Double longitude,
                                            HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            Rider rider = riderService.getOrCreateRiderForUser(userId);
            riderService.updateRiderLocation(rider.getId(), latitude, longitude);
            return ResponseEntity.ok("Location updated");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/status")
    public ResponseEntity<?> updateStatus(@RequestParam RiderStatus status, HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            Rider rider = riderService.getOrCreateRiderForUser(userId);
            riderService.updateRiderStatus(rider.getId(), status);
            return ResponseEntity.ok("Status updated");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/nearby")
    public ResponseEntity<?> getNearbyRiders(@RequestParam Double latitude, 
                                             @RequestParam Double longitude,
                                             @RequestParam(defaultValue = "10.0") Double radius) {
        try {
            List<Rider> riders = riderService.getNearbyAvailableRiders(latitude, longitude, radius);
            return ResponseEntity.ok(riders);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/my-bids")
    public ResponseEntity<?> getMyBids(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            Rider rider = riderService.getRiderByUserId(userId);
            List<Bid> bids = biddingService.getRiderBids(rider.getId());
            return ResponseEntity.ok(bids);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getRiderStats(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            Rider rider = riderService.getRiderByUserId(userId);
            java.util.Map<String, Object> stats = riderService.getRiderStats(rider.getId());
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> getRiderTransactions(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            Rider rider = riderService.getRiderByUserId(userId);
            java.util.List<java.util.Map<String, Object>> transactions = riderService.getRiderTransactions(rider.getId());
            return ResponseEntity.ok(transactions);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{riderId}/location")
    public ResponseEntity<?> getRiderLocation(@PathVariable Long riderId) {
        try {
            Rider rider = riderService.getRiderById(riderId);
            java.util.Map<String, Object> location = new java.util.HashMap<>();
            location.put("latitude", rider.getCurrentLatitude());
            location.put("longitude", rider.getCurrentLongitude());
            location.put("lastLocationUpdate", rider.getLastLocationUpdate());
            return ResponseEntity.ok(location);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}

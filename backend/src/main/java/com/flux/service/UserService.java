package com.flux.service;

import com.flux.model.entity.User;
import com.flux.model.enums.AccountStatus;
import com.flux.model.enums.UserRole;
import com.flux.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;

    /** Wrapper that also exposes whether the user was just newly created. */
    public static class UserResult {
        private final User user;
        private final boolean newlyCreated;

        public UserResult(User user, boolean newlyCreated) {
            this.user = user;
            this.newlyCreated = newlyCreated;
        }

        public User getUser() { return user; }
        public boolean isNewlyCreated() { return newlyCreated; }
    }

    /**
     * Creates a minimal user record on first login (name is a placeholder until profile completion).
     * If user already exists, returns the existing record.
     */
    @Transactional
    public UserResult createOrGetUserWithStatus(String mobileNumber, String fullName, UserRole role) {
        Optional<User> existingUser = userRepository.findByMobileNumber(mobileNumber);

        if (existingUser.isPresent()) {
            log.info("Existing user found for mobile={}", mobileNumber);
            return new UserResult(existingUser.get(), false);
        }

        String fixedOtp = generateFixedOtp(mobileNumber);
        
        User newUser = User.builder()
                .mobileNumber(mobileNumber)
                .fullName(fullName)
                .role(role)
                .status(AccountStatus.ACTIVE)
                .fixedOtp(fixedOtp)
                .build();

        User saved = userRepository.save(newUser);
        log.info("New user created: mobile={}, role={}, fixedOtp={}", mobileNumber, role, fixedOtp);
        return new UserResult(saved, true);
    }
    
    private String generateFixedOtp(String mobileNumber) {
        int lastFourDigits = Integer.parseInt(mobileNumber.substring(mobileNumber.length() - 4));
        int otp = (lastFourDigits * 7 + 1234) % 10000;
        return String.format("%04d", otp);
    }

    /** Legacy convenience wrapper used by remaining callers. */
    @Transactional
    public User createOrGetUser(String mobileNumber, String fullName, UserRole role) {
        return createOrGetUserWithStatus(mobileNumber, fullName, role).getUser();
    }

    /**
     * Completes user registration by setting full name and optional profile photo.
     */
    @Transactional
    public User completeProfile(Long userId, String fullName, String profilePhotoUrl) {
        User user = getUserById(userId);
        if (fullName != null && !fullName.isBlank()) {
            user.setFullName(fullName);
        }
        if (profilePhotoUrl != null && !profilePhotoUrl.isBlank()) {
            user.setProfilePhotoUrl(profilePhotoUrl);
        }
        User saved = userRepository.save(user);
        log.info("Profile completed for userId={}, name={}", userId, fullName);
        return saved;
    }

    public User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User getUserByMobileNumber(String mobileNumber) {
        return userRepository.findByMobileNumber(mobileNumber)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Transactional
    public User updateUser(Long userId, User updatedUser) {
        User user = getUserById(userId);

        if (updatedUser.getFullName() != null) {
            user.setFullName(updatedUser.getFullName());
        }
        if (updatedUser.getProfilePhotoUrl() != null) {
            user.setProfilePhotoUrl(updatedUser.getProfilePhotoUrl());
        }
        if (updatedUser.getHomeAddress() != null) {
            user.setHomeAddress(updatedUser.getHomeAddress());
        }
        if (updatedUser.getWorkAddress() != null) {
            user.setWorkAddress(updatedUser.getWorkAddress());
        }
        if (updatedUser.getNotificationsEnabled() != null) {
            user.setNotificationsEnabled(updatedUser.getNotificationsEnabled());
        }

        return userRepository.save(user);
    }

    @Transactional
    public void updateUserStatus(Long userId, AccountStatus status) {
        User user = getUserById(userId);
        user.setStatus(status);
        userRepository.save(user);
        log.info("User {} status updated to: {}", userId, status);
    }

    @Transactional
    public void incrementBookingCount(Long userId) {
        User user = getUserById(userId);
        user.setTotalBookings(user.getTotalBookings() + 1);
        userRepository.save(user);
    }

    @Transactional
    public void updateAverageRating(Long userId, Double newRating, boolean isGiven) {
        User user = getUserById(userId);

        if (isGiven) {
            double currentAvg = user.getAverageRatingGiven();
            int totalBookings = user.getTotalBookings();
            double newAvg = ((currentAvg * (totalBookings - 1)) + newRating) / totalBookings;
            user.setAverageRatingGiven(newAvg);
        } else {
            double currentAvg = user.getAverageRatingReceived();
            int totalBookings = user.getTotalBookings();
            double newAvg = ((currentAvg * (totalBookings - 1)) + newRating) / totalBookings;
            user.setAverageRatingReceived(newAvg);
        }

        userRepository.save(user);
    }

    public long getTotalUserCount() {
        return userRepository.count();
    }

    public long getUserCountByRole(UserRole role) {
        return userRepository.countByRole(role);
    }

    public List<User> getAllUsersWithSearch(String search) {
        if (search != null && !search.isBlank()) {
            return userRepository.findByFullNameContainingIgnoreCaseOrMobileNumberContaining(search, search);
        }
        return userRepository.findAll();
    }

    @Transactional
    public void updateFcmToken(Long userId, String fcmToken) {
        User user = getUserById(userId);
        user.setFcmToken(fcmToken);
        userRepository.save(user);
        log.info("FCM token updated for userId={}", userId);
    }
}


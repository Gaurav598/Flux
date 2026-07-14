package com.flux.service;

import com.flux.model.entity.Booking;
import com.flux.model.entity.Notification;
import com.flux.model.entity.Rider;
import com.flux.model.entity.User;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.flux.repository.NotificationRepository;
import com.flux.repository.RiderRepository;
import com.flux.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final UserService userService;
    private final UserRepository userRepository;
    private final RiderRepository riderRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final FirebaseMessaging firebaseMessaging;

    @Transactional
    public Notification createNotification(Long userId, String title, String message, 
                                           String type, Long bookingId) {
        User user = userService.getUserById(userId);
        
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);

        if (bookingId != null) {
            Booking booking = new Booking();
            booking.setId(bookingId);
            notification.setBooking(booking);
        }

        Notification savedNotification = notificationRepository.save(notification);
        
        // 1. Send via WebSocket (In-app)
        messagingTemplate.convertAndSend("/topic/user/" + userId + "/notifications", savedNotification);
        
        // 2. Send via Firebase Cloud Messaging (Push Notification for background/killed state)
        sendPushNotification(user, savedNotification);
        
        log.info("Notification created for user {}: {}", userId, title);
        return savedNotification;
    }

    private void sendPushNotification(User user, Notification notification) {
        try {
            String fcmToken = user.getFcmToken();
            if (fcmToken == null || fcmToken.isBlank()) {
                log.debug("No FCM token for user {}, skipping push notification", user.getId());
                return;
            }

            Message fcmMessage = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(
                            com.google.firebase.messaging.Notification.builder()
                                    .setTitle(notification.getTitle())
                                    .setBody(notification.getMessage())
                                    .build()
                    )
                    .putData("title", notification.getTitle())
                    .putData("body", notification.getMessage())
                    .putData("type", notification.getType() != null ? notification.getType() : "")
                    .putData(
                            "bookingId",
                            notification.getBooking() != null && notification.getBooking().getId() != null
                                    ? notification.getBooking().getId().toString()
                                    : ""
                    )
                    .putData("notificationId", notification.getId().toString())
                    .build();

            String messageId = firebaseMessaging.send(fcmMessage);
            log.info(
                    "FCM push sent for user {} notification {} (messageId={})",
                    user.getId(),
                    notification.getId(),
                    messageId
            );
        } catch (FirebaseMessagingException e) {
            log.warn(
                    "FCM send failed for user {} notification {}: {}",
                    user.getId(),
                    notification.getId(),
                    e.getMessage()
            );
        } catch (Exception e) {
            log.error("Unexpected error sending push notification", e);
        }
    }

    public void notifyUser(Long userId, String title, String message) {
        createNotification(userId, title, message, "BOOKING", null);
    }

    public void notifyUserWithType(Long userId, String title, String message, String type, Long bookingId) {
        createNotification(userId, title, message, type, bookingId);
    }

    public void notifyRider(Long riderId, String title, String message) {
        Rider rider = riderRepository.findById(riderId)
                .orElseThrow(() -> new RuntimeException("Rider not found"));
        Long riderUserId = rider.getUser() != null ? rider.getUser().getId() : null;
        if (riderUserId == null) {
            throw new RuntimeException("Rider user not found");
        }
        createNotification(riderUserId, title, message, "BOOKING", null);
    }

    public void notifyRiderWithType(Long riderId, String title, String message, String type, Long bookingId) {
        Rider rider = riderRepository.findById(riderId)
                .orElseThrow(() -> new RuntimeException("Rider not found"));
        Long riderUserId = rider.getUser() != null ? rider.getUser().getId() : null;
        if (riderUserId == null) {
            throw new RuntimeException("Rider user not found");
        }
        createNotification(riderUserId, title, message, type, bookingId);
    }

    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        List<Notification> unreadNotifications = getUnreadNotifications(userId);
        
        for (Notification notification : unreadNotifications) {
            notification.setIsRead(true);
            notificationRepository.save(notification);
        }
        
        log.info("Marked {} notifications as read for user {}", unreadNotifications.size(), userId);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }
}

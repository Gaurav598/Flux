package com.flux.controller;

import com.flux.model.entity.Notification;
import com.flux.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<?> getNotifications(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            List<Notification> notifications = notificationService.getUserNotifications(userId);
            return ResponseEntity.ok(notifications.stream().map(this::toMap).collect(Collectors.toList()));
        } catch (Exception e) {
            log.error("Error fetching notifications: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/unread")
    public ResponseEntity<?> getUnreadNotifications(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            List<Notification> notifications = notificationService.getUnreadNotifications(userId);
            return ResponseEntity.ok(notifications.stream().map(this::toMap).collect(Collectors.toList()));
        } catch (Exception e) {
            log.error("Error fetching unread notifications: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            long count = notificationService.getUnreadCount(userId);
            return ResponseEntity.ok(Map.of("count", count));
        } catch (Exception e) {
            log.error("Error fetching unread count: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(
            @PathVariable Long id, HttpServletRequest request) {
        notificationService.markAsRead(id, (Long) request.getAttribute("userId"));
        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            notificationService.markAllAsRead(userId);
            return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
        } catch (Exception e) {
            log.error("Error marking all notifications as read: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    private Map<String, Object> toMap(Notification n) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", n.getId());
        map.put("title", n.getTitle());
        map.put("message", n.getMessage());
        map.put("type", n.getType());
        map.put("read", n.getIsRead());
        map.put("createdAt", n.getCreatedAt() != null ? n.getCreatedAt().toString() : null);
        if (n.getBooking() != null) {
            map.put("bookingId", n.getBooking().getId());
        }
        return map;
    }
}

package com.flux.service;

import com.flux.model.entity.Booking;
import com.flux.model.entity.Rider;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RealtimeEventService {
    private final SimpMessagingTemplate messagingTemplate;

    public void publishBookingAfterCommit(Booking booking) {
        afterCommit(() -> {
            Map<String, Object> event = new LinkedHashMap<>();
            event.put("eventId", "booking-" + booking.getId() + "-" + booking.getVersion());
            event.put("bookingId", booking.getId());
            event.put("status", booking.getStatus().name());
            event.put("version", booking.getVersion());
            event.put("updatedAt", booking.getUpdatedAt());
            event.put("cancellationReason", booking.getCancellationReason());
            messagingTemplate.convertAndSend("/topic/booking/" + booking.getId() + "/status", event);
        });
    }

    public void publishLocationAfterCommit(Booking booking, Rider rider) {
        afterCommit(() -> {
            LocalDateTime timestamp = rider.getLastLocationUpdate();
            Map<String, Object> event = new LinkedHashMap<>();
            event.put("eventId", "location-" + rider.getId() + "-"
                    + (timestamp == null ? 0 : timestamp.toInstant(ZoneOffset.UTC).toEpochMilli()));
            event.put("bookingId", booking.getId());
            event.put("riderId", rider.getId());
            event.put("latitude", rider.getCurrentLatitude());
            event.put("longitude", rider.getCurrentLongitude());
            event.put("recordedAt", timestamp);
            messagingTemplate.convertAndSend("/topic/booking/" + booking.getId() + "/location", event);
        });
    }

    private void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }
}

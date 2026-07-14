package com.flux.service;

import com.flux.model.entity.Booking;
import com.flux.model.entity.ChatMessage;
import com.flux.model.entity.User;
import com.flux.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final BookingService bookingService;
    private final UserService userService;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMessages(Long bookingId, Long currentUserId) {
        Booking booking = bookingService.getBookingById(bookingId);
        ensureParticipantAccess(booking, currentUserId);

        return chatMessageRepository.findByBookingIdOrderByCreatedAtAsc(bookingId)
                .stream()
                .map(message -> toDto(message, currentUserId))
                .collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> sendMessage(Long bookingId, Long senderUserId, String messageText) {
        Booking booking = bookingService.getBookingById(bookingId);
        ensureParticipantAccess(booking, senderUserId);

        if (messageText == null || messageText.trim().isEmpty()) {
            throw new RuntimeException("Message cannot be empty");
        }

        User sender = userService.getUserById(senderUserId);
        ChatMessage chatMessage = ChatMessage.builder()
                .booking(booking)
                .sender(sender)
                .message(messageText.trim())
                .build();

        ChatMessage saved = chatMessageRepository.save(chatMessage);

        Long receiverUserId = resolveCounterpartyUserId(booking, senderUserId);
        if (receiverUserId != null) {
            notificationService.createNotification(
                    receiverUserId,
                    "New message",
                    sender.getFullName() + ": " + saved.getMessage(),
                    "CHAT",
                    booking.getId()
            );
        }

        return toDto(saved, senderUserId);
    }

    private void ensureParticipantAccess(Booking booking, Long userId) {
        Long bookingUserId = booking.getUser() != null ? booking.getUser().getId() : null;
        Long riderUserId = (booking.getRider() != null && booking.getRider().getUser() != null)
                ? booking.getRider().getUser().getId()
                : null;

        boolean allowed = (bookingUserId != null && bookingUserId.equals(userId))
                || (riderUserId != null && riderUserId.equals(userId));

        if (!allowed) {
            throw new RuntimeException("You are not allowed to access this chat");
        }
    }

    private Long resolveCounterpartyUserId(Booking booking, Long senderUserId) {
        Long bookingUserId = booking.getUser() != null ? booking.getUser().getId() : null;
        Long riderUserId = (booking.getRider() != null && booking.getRider().getUser() != null)
                ? booking.getRider().getUser().getId()
                : null;

        if (bookingUserId != null && bookingUserId.equals(senderUserId)) {
            return riderUserId;
        }
        if (riderUserId != null && riderUserId.equals(senderUserId)) {
            return bookingUserId;
        }
        return null;
    }

    private Map<String, Object> toDto(ChatMessage message, Long currentUserId) {
        Long senderId = message.getSender() != null ? message.getSender().getId() : null;
        String senderName = message.getSender() != null ? message.getSender().getFullName() : "Unknown";
        boolean fromMe = senderId != null && senderId.equals(currentUserId);

        return Map.of(
                "id", message.getId(),
                "bookingId", message.getBooking().getId(),
                "senderUserId", senderId,
                "senderName", senderName,
                "fromMe", fromMe,
                "message", message.getMessage(),
                "createdAt", message.getCreatedAt() != null ? message.getCreatedAt().toString() : ""
        );
    }
}

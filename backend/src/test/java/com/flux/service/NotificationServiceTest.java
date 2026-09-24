package com.flux.service;

import com.flux.model.entity.Notification;
import com.flux.model.entity.User;
import com.flux.repository.NotificationRepository;
import com.flux.repository.RiderRepository;
import com.flux.repository.UserRepository;
import com.google.firebase.messaging.FirebaseMessaging;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {
    @Mock NotificationRepository notificationRepository;
    @Mock UserService userService;
    @Mock UserRepository userRepository;
    @Mock RiderRepository riderRepository;
    @Mock SimpMessagingTemplate messagingTemplate;
    @Mock FirebaseMessaging firebaseMessaging;
    @InjectMocks NotificationService service;

    @Test
    void userCannotMarkAnotherUsersNotificationRead() {
        Notification notification = Notification.builder()
                .id(5L)
                .user(User.builder().id(10L).build())
                .isRead(false)
                .build();
        when(notificationRepository.findById(5L)).thenReturn(Optional.of(notification));

        assertThrows(AccessDeniedException.class, () -> service.markAsRead(5L, 11L));
        verify(notificationRepository, never()).save(notification);
    }
}

package com.flux.config;

import com.flux.model.entity.Booking;
import com.flux.model.entity.Rider;
import com.flux.repository.BookingRepository;
import com.flux.repository.RiderRepository;
import com.flux.repository.UserRepository;
import com.flux.security.JwtUtil;
import com.flux.model.entity.User;
import com.flux.model.enums.AccountStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.context.annotation.Bean;

import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtUtil jwtUtil;
    private final RiderRepository riderRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;

    @Value("${app.security.allowed-origins:http://localhost:3001,http://127.0.0.1:3001}")
    private String allowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[]{10_000, 10_000})
                .setTaskScheduler(webSocketTaskScheduler());
        config.setApplicationDestinationPrefixes("/app");
    }

    @Bean
    public ThreadPoolTaskScheduler webSocketTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("flux-ws-heartbeat-");
        scheduler.setRemoveOnCancelPolicy(true);
        return scheduler;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins(java.util.Arrays.stream(allowedOrigins.split(","))
                        .map(String::trim)
                        .filter(origin -> !origin.isBlank())
                        .toArray(String[]::new))
                .withSockJS();
        registry.addEndpoint("/ws-native")
                .setAllowedOrigins(java.util.Arrays.stream(allowedOrigins.split(","))
                        .map(String::trim)
                        .filter(origin -> !origin.isBlank())
                        .toArray(String[]::new));
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    authenticate(accessor);
                } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                    authorizeSubscription(accessor);
                } else if (SimpMessageType.MESSAGE.equals(accessor.getMessageType())
                        && accessor.getUser() == null) {
                    throw new AccessDeniedException("WebSocket authentication is required");
                }
                return message;
            }
        });
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader("Authorization");
        if (header == null) {
            header = accessor.getFirstNativeHeader("authorization");
        }
        if (header == null || !header.startsWith("Bearer ")) {
            throw new AccessDeniedException("A bearer token is required for WebSocket connections");
        }

        String token = header.substring(7);
        try {
            String mobileNumber = jwtUtil.extractMobileNumber(token);
            if (!jwtUtil.validateToken(token, mobileNumber) || !jwtUtil.isAccessToken(token)) {
                throw new AccessDeniedException("Invalid WebSocket token");
            }
            String role = jwtUtil.extractRole(token);
            Long userId = jwtUtil.extractUserId(token);
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new AccessDeniedException("WebSocket account not found"));
            if (user.getStatus() != AccountStatus.ACTIVE
                    || !user.getMobileNumber().equals(mobileNumber)
                    || !user.getRole().name().equals(role)) {
                throw new AccessDeniedException("WebSocket account is no longer authorized");
            }
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            mobileNumber,
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + role))
                    );
            authentication.setDetails(userId);
            accessor.setUser(authentication);
        } catch (AccessDeniedException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new AccessDeniedException("Invalid WebSocket token", exception);
        }
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        if (!(accessor.getUser() instanceof UsernamePasswordAuthenticationToken authentication)
                || !(authentication.getDetails() instanceof Long userId)) {
            throw new AccessDeniedException("WebSocket authentication is required");
        }
        String destination = accessor.getDestination();
        if (destination == null) {
            throw new AccessDeniedException("A subscription destination is required");
        }
        boolean admin = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
        if (admin) {
            return;
        }

        String[] parts = destination.split("/");
        if (parts.length != 5 || !"topic".equals(parts[1])) {
            throw new AccessDeniedException("Subscription destination is not permitted");
        }
        long resourceId;
        try {
            resourceId = Long.parseLong(parts[3]);
        } catch (NumberFormatException exception) {
            throw new AccessDeniedException("Invalid subscription destination", exception);
        }

        if ("user".equals(parts[2]) && "notifications".equals(parts[4]) && resourceId == userId) {
            return;
        }
        if ("rider".equals(parts[2]) && "bookings".equals(parts[4])) {
            Rider rider = riderRepository.findByUserId(userId)
                    .orElseThrow(() -> new AccessDeniedException("Rider profile not found"));
            if (rider.getId().equals(resourceId)) {
                return;
            }
        }
        if ("booking".equals(parts[2])
                && List.of("bids", "status", "location", "chat").contains(parts[4])) {
            Booking booking = bookingRepository.findById(resourceId)
                    .orElseThrow(() -> new AccessDeniedException("Booking not found"));
            boolean owner = booking.getUser().getId().equals(userId);
            boolean assignedRider = booking.getRider() != null
                    && booking.getRider().getUser().getId().equals(userId);
            if (owner || assignedRider) {
                return;
            }
        }
        throw new AccessDeniedException("Subscription destination is not permitted");
    }
}

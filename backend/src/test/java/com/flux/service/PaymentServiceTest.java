package com.flux.service;

import com.flux.model.entity.Payment;
import com.flux.model.entity.Rider;
import com.flux.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {
    @Mock PaymentRepository paymentRepository;
    @Mock RiderService riderService;
    @InjectMocks PaymentService service;

    @BeforeEach
    void configure() {
        ReflectionTestUtils.setField(service, "freeTierEnabled", true);
        ReflectionTestUtils.setField(service, "subscriptionAmount", 0.0);
    }

    @Test
    void repeatedFreeSubscriptionReturnsExistingActivation() {
        Rider rider = Rider.builder().id(7L).build();
        Payment existing = Payment.builder()
                .id(11L)
                .rider(rider)
                .status("ACTIVE")
                .periodEnd(LocalDateTime.now().plusDays(1))
                .build();
        when(riderService.getRiderByIdWithLock(7L)).thenReturn(rider);
        when(paymentRepository.findFirstByRiderIdAndStatusOrderByCreatedAtDesc(7L, "ACTIVE"))
                .thenReturn(Optional.of(existing));

        assertSame(existing, service.createFreeSubscription(7L));
        verify(paymentRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void clientPaymentIdentifierCannotCreateSubscription() {
        assertThrows(IllegalStateException.class,
                () -> service.confirmSubscription(5L, "client-controlled-payment-id"));
        verify(paymentRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void disabledStripeWebhookNeverAcknowledgesPayload() {
        assertThrows(IllegalStateException.class,
                () -> service.handleStripeWebhook("{}", "unverified-signature"));
    }
}

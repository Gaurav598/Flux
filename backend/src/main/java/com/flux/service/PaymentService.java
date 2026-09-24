package com.flux.service;

import com.flux.model.entity.Payment;
import com.flux.model.entity.Rider;
import com.flux.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * PaymentService - Stripe is currently disabled.
 * All riders get a free subscription that is valid indefinitely.
 * Re-enable Stripe later once you are ready for production payments.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final RiderService riderService;

    @Value("${app.subscription.amount}")
    private Double subscriptionAmount;

    @Value("${app.subscription.free-tier-enabled:false}")
    private boolean freeTierEnabled;

    /**
     * Grants the rider a free subscription immediately without any payment.
     */
    @Transactional
    public Payment createFreeSubscription(Long riderId) {
        // Serialize activation per rider so concurrent retries cannot create two active rows.
        Rider rider = riderService.getRiderByIdWithLock(riderId);

        Payment existing = paymentRepository
                .findFirstByRiderIdAndStatusOrderByCreatedAtDesc(riderId, "ACTIVE")
                .filter(payment -> payment.getPeriodEnd() != null
                        && payment.getPeriodEnd().isAfter(LocalDateTime.now()))
                .orElse(null);
        if (existing != null) {
            return existing;
        }

        LocalDateTime now = LocalDateTime.now();
        // Grant subscription for 100 years (effectively permanent for free tier)
        LocalDateTime forever = now.plusYears(100);

        Payment payment = Payment.builder()
                .rider(rider)
                .amount(0.0)
                .paymentMethod("FREE")
                .transactionId("FREE-" + riderId + "-" + System.currentTimeMillis())
                .stripeSubscriptionId(null)
                .stripeCustomerId(null)
                .status("ACTIVE")
                .periodStart(now)
                .periodEnd(forever)
                .build();

        Payment savedPayment = paymentRepository.save(payment);
        riderService.activateSubscription(riderId, now, forever);

        log.info("Free subscription activated for rider {}", riderId);
        return savedPayment;
    }

    // --- PaymentController stubs (used by REST API) ---

    @Transactional
    public String createSubscriptionIntent(Long riderUserId) {
        if (!freeTierEnabled) {
            throw new IllegalStateException("Subscription payments are not configured");
        }
        Rider rider = riderService.getRiderByUserId(riderUserId);
        createFreeSubscription(rider.getId());
        return "FREE_SUBSCRIPTION_ACTIVATED";
    }

    @Transactional
    public Payment confirmSubscription(Long riderUserId, String paymentIntentId) {
        if (!freeTierEnabled || !"FREE_SUBSCRIPTION_ACTIVATED".equals(paymentIntentId)) {
            throw new IllegalStateException("Subscription payments are not configured");
        }
        Rider rider = riderService.getRiderByUserId(riderUserId);
        return paymentRepository.findFirstByRiderIdAndStatusOrderByCreatedAtDesc(rider.getId(), "ACTIVE")
                .filter(payment -> payment.getPeriodEnd() != null
                        && payment.getPeriodEnd().isAfter(LocalDateTime.now()))
                .orElseThrow(() -> new IllegalStateException("No server-created subscription activation exists"));
    }

    public void handleStripeWebhook(String payload, String signature) {
        throw new IllegalStateException("Stripe webhooks are disabled until provider verification is configured");
    }

    public String getSubscriptionStatus(Long userId) {
        Rider rider = riderService.getRiderByUserId(userId);
        return Boolean.TRUE.equals(rider.getSubscriptionActive())
                && rider.getSubscriptionEndDate() != null
                && rider.getSubscriptionEndDate().isAfter(LocalDateTime.now())
                ? "ACTIVE"
                : "INACTIVE";
    }

    // --- Query methods ---

    public List<Payment> getRiderPayments(Long riderId) {
        return paymentRepository.findByRiderId(riderId);
    }

    public List<Payment> getFailedPayments() {
        return paymentRepository.findByStatus("FAILED");
    }

    public long getTotalRevenueToday() {
        LocalDateTime start = java.time.LocalDate.now().atStartOfDay();
        LocalDateTime end = start.plusDays(1);
        return Math.round(paymentRepository.findByCreatedAtBetween(start, end).stream()
                .filter(payment -> "SUCCEEDED".equalsIgnoreCase(payment.getStatus())
                        || "ACTIVE".equalsIgnoreCase(payment.getStatus()))
                .mapToDouble(payment -> payment.getAmount() == null ? 0.0 : payment.getAmount())
                .sum());
    }

    public double getTotalRevenue() {
        return paymentRepository.findAll().stream()
                .filter(payment -> "SUCCEEDED".equalsIgnoreCase(payment.getStatus())
                        || "ACTIVE".equalsIgnoreCase(payment.getStatus()))
                .mapToDouble(payment -> payment.getAmount() == null ? 0.0 : payment.getAmount())
                .sum();
    }
}

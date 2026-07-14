package com.flux.controller;

import com.flux.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/create-subscription")
    public ResponseEntity<?> createSubscription(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            String clientSecret = paymentService.createSubscriptionIntent(userId);
            return ResponseEntity.ok(new PaymentResponse("success", clientSecret, "Subscription intent created"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new PaymentResponse("error", null, e.getMessage()));
        }
    }

    @PostMapping("/confirm-subscription")
    public ResponseEntity<?> confirmSubscription(@RequestParam String paymentIntentId, HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            var payment = paymentService.confirmSubscription(userId, paymentIntentId);
            return ResponseEntity.ok(new PaymentResponse("success", paymentIntentId, "Subscription confirmed"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new PaymentResponse("error", null, e.getMessage()));
        }
    }

    @PostMapping("/webhook/stripe")
    public ResponseEntity<?> handleStripeWebhook(@RequestBody String payload, @RequestHeader("Stripe-Signature") String signature) {
        try {
            paymentService.handleStripeWebhook(payload, signature);
            return ResponseEntity.ok("Webhook processed");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Webhook processing failed: " + e.getMessage());
        }
    }

    @GetMapping("/subscription-status")
    public ResponseEntity<?> getSubscriptionStatus(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            var status = paymentService.getSubscriptionStatus(userId);
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    static class PaymentResponse {
        public String status;
        public String clientSecret;
        public String message;

        PaymentResponse(String status, String clientSecret, String message) {
            this.status = status;
            this.clientSecret = clientSecret;
            this.message = message;
        }
    }
}

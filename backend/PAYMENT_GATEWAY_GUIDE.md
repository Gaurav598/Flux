# Payment Gateway Integration Guide

## Overview
Flux supports two payment gateways for rider subscriptions and user transactions:
1. **Stripe** - International payments, credit/debit cards
2. **Razorpay** - India-focused, UPI, cards, netbanking

---

## 1. Stripe Integration

### What is Stripe?
Stripe is a global payment processor that handles:
- Credit/debit card payments
- Subscription management
- Webhook notifications for payment events
- PCI compliance handling

### Setup Steps

1. **Create Stripe Account**
   - Go to https://stripe.com
   - Sign up and get API keys (Publishable + Secret)
   - Add keys to `.env`:
     ```
     STRIPE_API_KEY=sk_test_xxxxx
     STRIPE_WEBHOOK_SECRET=whsec_xxxxx
     STRIPE_SUBSCRIPTION_PRICE_ID=price_xxxxx
     ```

2. **How it works in Flux:**
   - Rider applies for subscription
   - Backend creates a **Payment Intent** (temporary order)
   - Mobile app collects card details securely via Stripe SDK
   - Backend confirms payment when card is processed
   - Stripe sends webhook notification on success/failure
   - Rider subscription is activated

3. **Flow:**
   ```
   Mobile App → POST /api/payments/create-subscription
   ↓
   Backend creates PaymentIntent (₹500 for 1 month)
   ↓
   Mobile receives clientSecret
   ↓
   Mobile collects card via Stripe UI (secure, PCI-compliant)
   ↓
   Mobile confirms payment → POST /api/payments/confirm-subscription
   ↓
   Backend verifies with Stripe
   ↓
   Stripe sends webhook → Backend activates subscription
   ```

4. **Cost:**
   - 2.9% + ₹2 per successful transaction
   - For ₹500 subscription: ~₹16.45 fee
   - No monthly fees, only per-transaction

---

## 2. Razorpay Integration (India-Focused)

### What is Razorpay?
Razorpay is India's leading payment gateway:
- UPI (Google Pay, PhonePe, Paytm)
- Debit/credit cards
- Netbanking
- Wallets
- Lower fees for Indian transactions

### Setup Steps

1. **Create Razorpay Account**
   - Go to https://razorpay.com
   - Sign up and get API keys
   - Add to `.env`:
     ```
     RAZORPAY_KEY_ID=rzp_test_xxxxx
     RAZORPAY_KEY_SECRET=xxxxx
     ```

2. **How it works:**
   - Rider initiates subscription
   - Backend creates Razorpay Order (₹500)
   - Mobile shows payment options (UPI, card, netbanking)
   - User pays via preferred method
   - Razorpay confirms payment
   - Backend activates subscription

3. **Flow:**
   ```
   Mobile App → POST /api/payments/create-razorpay-order
   ↓
   Backend creates Razorpay Order
   ↓
   Mobile shows payment options (UPI/Card/Netbanking)
   ↓
   User pays via UPI (instant, no card needed)
   ↓
   Razorpay confirms → Webhook to backend
   ↓
   Backend activates subscription
   ```

4. **Cost:**
   - UPI: 0% (free)
   - Cards: 2% + ₹0
   - Netbanking: 0.5% + ₹0
   - For ₹500 UPI: ₹0 fee (best for users!)

---

## 3. Recommended Strategy for India

**Use Razorpay as primary, Stripe as fallback:**

1. **For Indian users (majority):**
   - Show UPI first (instant, free, familiar)
   - Then cards/netbanking
   - Cost: ₹0–₹10 per transaction

2. **For international users:**
   - Use Stripe (accepts global cards)
   - Cost: ~₹16 per transaction

3. **Implementation:**
   ```java
   // Check user location
   if (isIndianUser) {
       useRazorpay();  // UPI, 0% fee
   } else {
       useStripe();    // Global cards
   }
   ```

---

## 4. Subscription Flow (Detailed)

### Step 1: Rider applies for subscription
```
POST /api/payments/create-subscription
Body: { userId: 123 }
Response: { clientSecret: "pi_xxxxx", amount: 500 }
```

### Step 2: Mobile collects payment
- Stripe SDK or Razorpay SDK handles card/UPI entry
- No sensitive data touches your backend (PCI-safe)

### Step 3: Backend confirms payment
```
POST /api/payments/confirm-subscription
Body: { paymentIntentId: "pi_xxxxx" }
Response: { status: "success", subscriptionId: "sub_xxxxx" }
```

### Step 4: Payment webhook
```
Stripe/Razorpay → POST /api/payments/webhook/stripe
Payload: { type: "payment_intent.succeeded", ... }
Backend: Activates subscription, updates Rider status
```

### Step 5: Rider sees active subscription
- Rider status = ACTIVE
- Subscription end date = today + 30 days
- Can now accept bookings

---

## 5. Database Schema

```sql
-- Payments table (already exists)
CREATE TABLE payments (
    id BIGINT PRIMARY KEY,
    rider_id BIGINT NOT NULL,
    amount DOUBLE NOT NULL,
    payment_method VARCHAR(50),  -- "STRIPE" or "RAZORPAY"
    transaction_id VARCHAR(255),  -- Stripe/Razorpay ID
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    status VARCHAR(50),  -- "ACTIVE", "FAILED", "EXPIRED"
    failure_reason VARCHAR(255),
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    created_at TIMESTAMP
);

-- Riders table (already has subscription fields)
ALTER TABLE riders ADD COLUMN subscription_active BOOLEAN DEFAULT false;
ALTER TABLE riders ADD COLUMN subscription_start_date TIMESTAMP;
ALTER TABLE riders ADD COLUMN subscription_end_date TIMESTAMP;
```

---

## 6. Error Handling

```java
// Common errors:
1. Payment declined → Show "Card declined, try another"
2. Insufficient funds → Show "Insufficient balance"
3. Network timeout → Retry automatically
4. Invalid card → Show "Invalid card details"
5. Webhook failure → Retry webhook 3 times
```

---

## 7. Testing

### Stripe Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
```

### Razorpay Test Mode
- All payments succeed in test mode
- No real money charged
- Switch to live mode after testing

---

## 8. Security Best Practices

1. **Never log card details** (PCI violation)
2. **Use HTTPS only** (encrypt in transit)
3. **Rotate API keys** every 90 days
4. **Validate webhooks** (verify signature)
5. **Store only transaction IDs**, not card numbers
6. **Use idempotency keys** to prevent duplicate charges

---

## 9. Monitoring & Alerts

Set up alerts for:
- Payment failures > 5% of transactions
- Webhook delivery failures
- Subscription expiry (notify rider to renew)
- Chargebacks or disputes

---

## 10. Pricing Summary

| Method | Fee | Best For |
|--------|-----|----------|
| Razorpay UPI | 0% | Indian users (fastest) |
| Razorpay Card | 2% | Indian users (backup) |
| Stripe Card | 2.9% + ₹2 | International users |

**For ₹500 subscription:**
- Razorpay UPI: ₹0 fee (user pays ₹500)
- Razorpay Card: ₹10 fee (user pays ₹510)
- Stripe: ₹16.45 fee (user pays ₹516.45)

---

## Next Steps

1. Create Stripe & Razorpay accounts
2. Add API keys to `.env`
3. Implement payment endpoints (see PaymentService.java)
4. Test with test cards
5. Deploy webhooks to production
6. Monitor transactions in dashboard

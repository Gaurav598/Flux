# Flux Manual Testing Guide

## Prerequisites

1. Apply the SQL migrations documented in `infra/db/migrations` to a disposable PostgreSQL database.
2. Configure backend environment values from `.env.example`; use test Firebase and no live payment credentials.
3. Set `FREE_SUBSCRIPTIONS_ENABLED=true` only for an explicit local demo. It is false in production configuration.
4. Start infrastructure with `docker compose up -d postgres redis zookeeper kafka`, then run `cd backend && ./gradlew bootRun`.
5. Set both mobile apps' `API_BASE_URL` and `SOCKET_URL`; run Metro and install debug builds on two devices/emulators.
6. Start the admin dashboard with `cd admin-dashboard && npm run dev`.

## Customer and bidding flow

1. Sign in as a customer through Firebase and create a booking with valid pickup/drop and fare.
2. Confirm the booking appears once in customer history and the timeline contains creation/bidding events.
3. Sign in as two approved, subscribed, available riders with compatible vehicles.
4. Submit bids from both riders. Confirm a duplicate bid from the same rider is rejected.
5. Select one bid as the customer. Confirm exactly one rider is assigned, the other bid is rejected, and both clients reconcile to the accepted booking.
6. Repeat with direct price acceptance and confirm pending bids are rejected.
7. Leave a booking beyond its bidding window and confirm new bids/acceptance are rejected.

## Tracking, OTP, and completion

1. Open tracking on customer and assigned-rider devices. Confirm “Live updates connected” appears when STOMP is available.
2. Move/update the rider device. Confirm customer position updates and location age remains fresh; stop updates for over 30 seconds and confirm it is no longer represented as current.
3. Disable/re-enable network. Confirm the client reports reconnecting, reconnects with no duplicate UI transition, and reconciles authoritative state.
4. Mark rider arrival. Confirm only the customer can fetch/view the short-lived OTP.
5. Enter an invalid OTP repeatedly; confirm attempts are bounded. Verify an expired OTP cannot start the trip.
6. Enter the valid OTP, start, and complete the trip. Confirm rider availability returns and full agreed fare appears in earnings without commission deduction.
7. Rate from each participant once; confirm duplicate or cross-role rating is rejected.

## Cancellation and recovery

1. Cancel a bidding booking as its owner and verify reason/status in customer history and admin bookings.
2. Cancel an accepted booking as the owner; confirm rider availability is restored.
3. Cancel an accepted/arrived booking as the assigned rider; confirm the customer is notified and rider cancellation count changes.
4. Attempt cancellation as an unrelated account and during `IN_PROGRESS`; confirm rejection.
5. Stop the backend while submitting a booking. Confirm the mobile app shows an error and does not invent a successful local booking. Restart and refresh history.
6. Interrupt the network during state changes, restore it, and confirm REST reconciliation yields consistent user/rider state.

## History and notifications

1. Create more than 20 historical bookings and scroll customer history; confirm the next page loads without duplicates.
2. Open completed/cancelled history cards in both apps; verify timeline timestamps, fare, status, and cancellation reason.
3. Generate notifications, verify newest-first persistence and unread count, mark one read, and confirm another account cannot mark it read.
4. Verify FCM and in-app paths do not create duplicate visible notifications.

## Subscription safety

1. With free tier disabled, confirm create/confirm subscription requests fail without activating a rider.
2. In local demo mode, call create once and confirm repeated calls return the same active record rather than creating duplicates.
3. Confirm an arbitrary `paymentIntentId` cannot create a subscription.
4. Confirm the disabled Stripe webhook returns an error and no payment/subscription state changes.

## Admin

1. Confirm login is unavailable when admin credentials are unset and works only with configured credentials.
2. Verify booking/rider/user lists are backend-derived.
3. Verify active rides, failed bookings, cancellation counts, available riders, and stale-location counts against database records.
4. Verify cancellation reasons/failed-booking notes appear in booking management.

Record device OS/version, backend commit, timestamps, and screenshots/logs for every failure. Do not use live payment credentials.


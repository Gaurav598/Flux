# Changelog

## Release stabilization baseline — 24 September 2026 (`7ab4398`)

This historical section describes the committed stabilization diff from baseline `888474f`. It is retained for context and is not attributed to the engineering-upgrade continuation below.

### Recovered and completed stabilization work

#### Backend business logic

- Added pessimistic booking, bid and rider lookups and a consistent lock order for acceptance.
- Enforced rider exclusivity across different bookings and rejected invalid/repeated bids.
- Added `BookingStateMachine` and conflict/not-found/API exception handling.
- Derived direct-accept rider identity, cancellation actors, rating actors, status actors and OTP actors from authenticated request context.
- Added expiring secure OTPs, attempt limits, owner-only OTP retrieval and participant-only booking access.
- Rejected pending bids when a booking is accepted directly or cancelled.
- Corrected rider earnings to the full final fare with zero per-ride commission under the subscription model.
- Replaced fabricated admin booking series/revenue with repository-derived counts and payment records.

#### Mobile applications

- Fixed FluxRider direct acceptance and replaced navigation to the undefined `ActiveBooking` route with registered `RideTracking` navigation after a successful response.
- Added stale-poll protection, submitted-bid filtering and normalized bid state.
- Added authoritative terminal/cancellation handling in rider tracking and user active-booking screens.
- Removed local reopening of bidding after terminal rider cancellation.
- Added bounded TTL notification deduplication and regression tests to both apps.
- Added safe-area notification positioning and capped popup stacking.
- Added keyboard/small-screen fallback and repeated-submit protection to rating.
- Removed the six baseline ESLint errors without changing the React Native 0.75.3 dependency set.

#### Security/configuration

- Removed fallback admin credentials and required explicit configuration.
- Restricted CORS and WebSocket origins.
- Hid FCM/OTP/banking/document fields from ordinary API serialization.
- Added development and production Spring profiles with production schema validation and graceful shutdown.
- Disabled implicit free subscriptions outside the explicit development profile.

#### Regression coverage

- Added booking state-machine tests.
- Added direct identity, authorization, OTP and required INR earnings unit tests.
- Added real PostgreSQL/Testcontainers contention tests for same-booking acceptance, cross-booking rider exclusivity and cancellation versus acceptance.
- Added mobile notification-deduper tests.

### Final-continuation changes

- Removed hardcoded public API IPs from mobile config, mocks, Vite/Vercel and native transport exceptions.
- Required HTTPS for mobile release URLs; added environment examples and admin API timeouts/JWT-expiry validation.
- Added authenticated STOMP CONNECT handling and owner/participant-scoped subscription authorization.
- Persisted invalid OTP attempt increments despite error responses, allowed safe expired-OTP reissue, and made repeated terminal/cancellation operations side-effect-free.
- Added the fourth PostgreSQL race test for direct acceptance competing with bid acceptance.
- Made the rider bid card height device-adaptive and scrollable.
- Corrected admin active-rider/active-booking query semantics and added Flux favicon metadata.
- Removed the obsolete Compose dashboard, aligned database variables and health dependencies, added backend health checking, internalized the production backend port and required TLS termination.
- Changed CI/Docker builds to execute tests, added commit-SHA image tags and corrected production Nginx deployment paths.
- Added a forward-only PostgreSQL stabilization migration with duplicate-payment preflight.
- Corrected `.gitignore` so `.gradle-home/` and PEM files are independently excluded.

### Intentionally deferred

- Execution of Testcontainers contention tests until Docker is available.
- Android/iOS and physical-device E2E validation, per the owner handoff.
- Production provider/TLS/database smoke testing and deployment; no production mutation was authorized.
- Durable cross-process notification history and a financial-column migration from `Double` to decimal/minor-unit representation.
- Dashboard code splitting and non-error mobile lint warning cleanup.
# Engineering upgrade integration — 2026-09-25

Built on the completed release-stabilization commit `7ab4398`; the items below are continuation changes only.

## Added

- Typed access/refresh JWT enforcement and current-account revalidation.
- Canonical Firebase phone verification plus bounded OTP send/verify attempts.
- Authenticated native STOMP endpoint, 10-second heartbeats, after-commit status/location events, event IDs, and version ordering.
- React Native STOMP clients with exponential reconnect, jitter, duplicate suppression, and REST reconciliation.
- Paginated customer/rider trip history, persisted lifecycle timelines, cancellation context, and participant-scoped location freshness.
- A forward-only migration for the persisted rider-en-route timeline timestamp.
- Admin operational metrics for failures, cancellations, available riders, and stale locations.
- Focused JWT, notification ownership, timeline, freshness, expiry, cancellation, and reconnect tests.
- `ENGINEERING_UPGRADE_REPORT.md`, `ARCHITECTURE.md`, `API_AND_REALTIME_REFERENCE.md`, and `MANUAL_TESTING_GUIDE.md`.

## Changed

- Notification read operations now enforce ownership.
- Demo/free subscriptions are idempotent; confirmation cannot create a missing server-side activation.
- Disabled Stripe webhooks fail explicitly rather than acknowledging unverified payloads.
- Customer/rider tracking keeps a 30-second reconciliation poll while realtime is connected.

## Security

- Removed deterministic fixed-OTP generation for newly created users.
- Refresh tokens are rejected by HTTP/STOMP resource authentication, and access tokens are rejected by refresh.
- Rider location REST access is booking-participant scoped; the legacy rider-ID endpoint is admin-only.

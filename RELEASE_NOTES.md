# Flux release-stabilization notes

Release-candidate branch: `codex/release-stabilization-2026-09-23`

Baseline: `888474f4953eb84dcaefc509700d1038469ba7a1`

Validation date: 24 September 2026

## Release status

This branch is a code-complete stabilization candidate. It is not a production approval. Automated source, unit, TypeScript, lint, dashboard-build and static Compose checks pass, but PostgreSQL contention tests could not run because the local Docker daemon is unavailable. Android/iOS device builds and full provider-backed end-to-end testing are intentionally handed off for staging validation.

## Booking and ride behavior

- Direct acceptance now derives the rider profile from the authenticated user and navigates FluxRider to the registered `RideTracking` route only after backend confirmation.
- Direct and bid acceptance lock the booking before the rider, validate the booking state and bid window, and reject a rider who already has another active trip.
- Available bookings are filtered server-side for riders who already bid; mobile request sequencing prevents a stale poll from restoring obsolete offers.
- A shared booking state machine prevents terminal bookings from returning to active states.
- Cancellation and rating operations derive ownership from the authenticated actor. The legacy `byUser` request field remains accepted for compatibility but is not trusted.
- Rider cancellation is terminal and both apps return to a safe home state instead of reopening bidding locally.
- Ride arrival issues a secure, expiring OTP. Invalid attempts persist even when the request returns an error, and expired OTPs may be reissued by marking arrival again.
- Repeated terminal-status and cancellation requests are idempotent and do not repeat counters or notifications.

## Financial behavior

- Flux's documented subscription model is authoritative: the agreed final fare is the rider's full ride earning and per-ride company commission is zero.
- Regression coverage verifies ₹100, ₹500, ₹1,920 and ₹2,000.
- Free rider subscriptions are disabled by default and enabled only by the explicit development profile/property.
- Admin revenue is sourced from payment records, not an invented percentage of booking fares.

## Security and privacy

- Cancellation, status, OTP, bid acceptance, booking access and rating paths now enforce authenticated roles and participant ownership.
- The fallback admin password was removed. `ADMIN_USERNAME` and `ADMIN_PASSWORD` must be supplied explicitly.
- CORS and WebSocket origins come from `ALLOWED_ORIGINS`; wildcard production access is not enabled.
- STOMP connections require a JWT, and notification, rider-booking and booking-bid subscriptions are scoped to the authenticated owner/participant (or admin).
- OTPs, FCM tokens and rider banking/document fields are excluded from ordinary serialized booking/user payloads.
- Mobile release configuration requires HTTPS and no longer embeds the former public IP. Android production cleartext traffic and the iOS insecure-host exception were removed.
- The repository currently contains no tracked private key or service-account file. Git history contains a removed PEM at commit `4a9613e`; credentials associated with it must be treated as exposed and rotated if they were ever real.

## Mobile applications

- FluxUser and FluxRider notification deduplication now uses stable event IDs with a 10-minute TTL and a bounded 256-entry cache; dismissing a popup no longer immediately forgets the event.
- Popup stacking is capped at three and respects safe-area insets.
- The rating screen uses keyboard avoidance with an adaptive scroll fallback and guards repeated submission taps.
- The rider booking card now sizes from the device window and remains scrollable rather than relying on one fixed sheet height.
- Active ride screens react to authoritative cancellation and terminal states.
- Previously reported ESLint errors were removed. Existing style warnings remain non-blocking and are listed in the regression report.
- React Native remains at 0.75.3; no React Native, Reanimated, Metro or NativeWind upgrade was introduced.

## Admin dashboard

- Expired or malformed JWTs are rejected during session restoration, API calls have a 15-second timeout, and unauthorized responses clear the session.
- Daily booking charts and revenue cards use backend-derived records. Active-rider and active-booking labels now match their queries.
- Development proxy configuration is environment-driven, the obsolete public-IP Vercel rewrite was removed, and a Flux favicon/theme color was added.

## Deployment and operations

- Development Compose no longer references the removed legacy dashboard and waits for healthy database, Redis and backend services where applicable.
- Production backend is internal-only behind Nginx. Nginx redirects HTTP to TLS, exposes secure WebSocket proxying, and requires mounted certificate/key paths.
- Backend images can be pinned with `FLUX_IMAGE_TAG`; CI publishes the commit SHA as well as `latest`, and CI now runs the backend test suite.
- The backend container includes a liveness health check and graceful Spring shutdown is enabled in the production profile.
- Production uses `ddl-auto: validate`. Apply `infra/db/migrations/2026-09-24-release-stabilization.sql` to a backed-up staging database before deploying the application image.

## Known limitations

- Four PostgreSQL/Testcontainers race tests (the three original contention scenarios plus direct acceptance versus bid acceptance) were skipped because Docker is not running.
- Android debug builds could not configure because the local `sdk.dir` points to a nonexistent Android SDK. iOS builds and physical-device flows were not run.
- The dashboard bundle is 675.02 kB minified and triggers Vite's 500 kB warning.
- Notification deduplication is bounded in memory and intentionally does not survive a full process restart; server event IDs still prevent duplicates within the active process window.
- TLS certificates, DNS, Firebase, LocationIQ, payment-provider settings and production database/Redis/Kafka services must be supplied and verified in staging.

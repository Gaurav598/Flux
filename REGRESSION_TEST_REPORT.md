# Flux regression test report

Date: 24 September 2026

Branch: `codex/release-stabilization-2026-09-23`

Baseline/HEAD before stabilization commit: `888474f4953eb84dcaefc509700d1038469ba7a1`

Result meanings: **PASS** ran successfully; **FAIL** ran and found a defect; **SKIPPED** was discovered by the test runner but its environment condition was unavailable; **BLOCKED** could not execute in this environment; **NOT RUN** requires external/manual validation.

## Automated and static validation

| Component | Command | Result | Actual evidence |
|---|---|---:|---|
| Repository recovery | `pwd`; `git status --short --branch`; `git branch --show-current`; `git rev-parse HEAD`; `git diff --stat`; `git diff --check`; untracked-file listing | PASS | Existing stabilization branch and all uncommitted work preserved; no reset/clean performed. |
| Backend production build | `cd backend && ./gradlew clean build --no-daemon` | PASS | Java/main/test compilation, Boot JAR, tests and Gradle `check` completed; build successful in 10 s. Deprecation warnings remain for `JwtUtil` and Gradle 9 compatibility. |
| Backend unit tests | same Gradle command | PASS | 11 executed, 11 passed: 2 state-machine cases and 9 booking-service cases (including four INR parameters). |
| PostgreSQL contention tests | same Gradle command | SKIPPED | 4 discovered, 4 skipped by `@Testcontainers(disabledWithoutDocker=true)`. Docker socket is unavailable. |
| Docker runtime | `docker info --format '{{.ServerVersion}}'` | BLOCKED | No Docker socket at `/Users/gaurav/.docker/run/docker.sock`. |
| FluxUser Jest | `cd mobile/FluxUser && npm test -- --runInBand` | PASS | 3 suites, 6 tests passed. |
| FluxUser TypeScript | `cd mobile/FluxUser && npx tsc --noEmit` | PASS | Exit 0, no diagnostics. |
| FluxUser ESLint | `cd mobile/FluxUser && npm run lint` | PASS | Exit 0; 0 errors and 45 existing warnings. |
| FluxRider Jest | `cd mobile/FluxRider && npm test -- --runInBand` | PASS | 3 suites, 7 tests passed. |
| FluxRider TypeScript | `cd mobile/FluxRider && npx tsc --noEmit` | PASS | Exit 0, no diagnostics. |
| FluxRider ESLint | `cd mobile/FluxRider && npm run lint` | PASS | Exit 0; 0 errors and 48 existing warnings. |
| Admin TypeScript | `cd admin-dashboard && npx tsc --noEmit` | PASS | Exit 0 after adding Vite environment typings. |
| Admin production build | `cd admin-dashboard && npm run build` | PASS | 2,566 modules; JS 675.02 kB (196.95 kB gzip). Bundle-size warning only. |
| Development Compose | environment placeholders + `docker compose -f docker-compose.yml config --quiet` | PASS | Static Compose parsing successful. Containers were not started. |
| Production Compose | environment/TLS placeholders + `docker compose -f docker-compose.prod.yml config --quiet` | PASS | Static Compose parsing successful. Containers and TLS handshake were not exercised. |
| iOS plist syntax | `plutil -lint` for both application plists | PASS | Both plists reported `OK`. |
| Android FluxUser | `cd mobile/FluxUser/android && ./gradlew :app:assembleDebug --no-daemon` | BLOCKED | Native configuration stopped because `sdk.dir` does not exist / no valid Android SDK is configured. |
| Android FluxRider | `cd mobile/FluxRider/android && ./gradlew :app:assembleDebug --no-daemon` | BLOCKED | Same Android SDK environment blocker. |
| Secret/static endpoint scan | tracked-file scans for private-key markers, known public IPs and tracked secret files | PASS with historical action | No current tracked secret/key or obsolete public-IP code reference. A PEM existed historically and was removed in `4a9613e`; rotate if real. |
| Whitespace/generated-file check | `git diff --check`; tracked build-artifact scan | PASS | No whitespace errors. Only the required Gradle wrapper JAR is tracked among matched build extensions. |

## Backend regression coverage

| Scenario | Test/evidence | Result |
|---|---|---:|
| Authenticated direct acceptance maps user ID to rider ID | `BookingServiceTest.directAcceptanceMapsAuthenticatedUserToRiderProfile` | PASS |
| Supported and invalid state transitions | `BookingStateMachineTest` | PASS |
| Unauthorized cancellation | `BookingServiceTest.rejectsUnauthorizedCancellation` | PASS |
| Unauthorized generic status update | `BookingServiceTest.rejectsUnauthorizedStatusUpdate` | PASS |
| Unauthorized rating | `BookingServiceTest.rejectsUnauthorizedRating` | PASS |
| Unauthorized and incorrect OTP | `BookingServiceTest.rejectsUnauthorizedAndIncorrectOtpVerification` | PASS |
| Full-fare rider earning for ₹100/₹500/₹1,920/₹2,000 | parameterized `completedRidePaysFullFareWithoutPerRideCommission` | PASS |
| Two riders accept one booking concurrently | `BookingConcurrencyPostgresTest.twoRidersCompetingForSameBookingProduceOneAssignment` | SKIPPED |
| One rider accepts two bookings concurrently | `oneRiderCannotAcceptTwoSeparateBookingsConcurrently` | SKIPPED |
| Cancellation races accepted bid | `cancellationRacingBidAcceptanceCannotLeaveAnActivePendingBid` | SKIPPED |
| Direct acceptance races bid acceptance | `directAcceptanceCompetingWithBidAcceptanceProducesOneAssignment` | SKIPPED |

The skipped tests use two executor threads, a start barrier, real Spring transactions and a PostgreSQL Testcontainers database. They are not mock simulations. Run them with Docker using:

```bash
cd backend
./gradlew test --tests com.flux.service.BookingConcurrencyPostgresTest --no-daemon
```

## Source-level workflow verification

| Area | Expected result | Actual evidence | Status |
|---|---|---|---:|
| Direct rider acceptance | Confirm backend first, then active tracking | Authenticated user-to-rider lookup, booking/rider locks, Redux update from response, registered `RideTracking` replacement | PASS (automated unit + source); device NOT RUN |
| Normal bid acceptance | Only booking owner accepts; one rider/booking | Actor ownership, booking→bid→rider lock order, rejected competing bids | PASS (unit/source); DB race SKIPPED |
| Duplicate bids | Duplicate cannot reappear or be submitted | DB unique pair, backend `exists` filter, Redux submitted-ID filter and stale-response sequence guard | PASS (source); reconnect device NOT RUN |
| User/rider cancellation | Terminal state wins and obsolete UI exits | State machine, actor ownership, pending-bid rejection, mobile reset/replace to Home | PASS (unit/source); device NOT RUN |
| OTP | Owner receives expiring OTP; only assigned rider verifies | Sensitive field hidden, owner endpoint, secure random value, expiry, persistent attempt counter, rider ownership | PASS (unit/source); device NOT RUN |
| Completion/rating | One completion; participant-only rating | IN_PROGRESS guard, terminal transition, duplicate-rating conflict, role-specific rating fields | PASS (unit/source); E2E NOT RUN |
| Ride restoration | App restores authoritative active booking | active-booking endpoints and navigation listeners use backend state | PASS (source); cold-start device NOT RUN |
| Notification duplicates | Duplicate event appears once during retention window | bounded TTL deduper tests pass in both apps | PASS |
| Financial consistency | Full agreed fare, no 4% ride fee | backend parameterized tests and rider stats fallback | PASS (backend); UI/device NOT RUN |

## Manual/staging matrix still required

| Journey | Procedure | Status |
|---|---|---:|
| Customer E2E | Login → create booking → bids → select rider → tracking → OTP → completion → rating | NOT RUN |
| Rider direct E2E | Login → availability → direct accept → pickup → OTP → complete → earnings | NOT RUN |
| Rider bid E2E | Login → availability → bid → user accepts → ride lifecycle | NOT RUN |
| Cancellation matrix | Before bid, while popup open, bid request in flight, after acceptance, before OTP, during ride according to supported rules | NOT RUN |
| Realtime resilience | Foreground/background, disconnect/reconnect, repeated delivery, stale poll response | NOT RUN |
| Accessibility/UI | Small Android, iPhone safe area, keyboard, large fonts, four-digit+ amounts, notification overlay interactions | NOT RUN |
| Push/provider integration | Firebase foreground/background delivery and notification-open routing | NOT RUN |
| Deployment smoke | Apply migration, start Compose, verify health/TLS/WSS/CORS/admin/API/provider connectivity, execute rollback | NOT RUN |

No manual or provider-backed scenario is marked passed merely because source code exists.

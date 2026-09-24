# Flux release readiness

## Decision

**CONDITIONALLY READY — EXTERNAL VALIDATION REQUIRED**

The stabilization implementation compiles and its available automated checks pass. It is ready for staging/release review, but not approved for production until the database contention suite, native builds, device journeys and deployed infrastructure are verified.

Branch: `codex/release-stabilization-2026-09-23`

Baseline: `888474f4953eb84dcaefc509700d1038469ba7a1`

## Verified release-critical behavior

- Backend clean build succeeds; 11 non-container tests pass.
- Direct acceptance uses authenticated identity, a registered rider route and backend-confirmed state.
- Booking and rider locking use a consistent booking→bid (when present)→rider order.
- State, cancellation, OTP, status and rating rules are enforced server-side.
- Terminal actions are protected against repeated side effects.
- Rider ride earnings equal the agreed final fare under the subscription model for the four required amounts.
- Both mobile Jest suites, TypeScript checks and ESLint commands succeed with zero lint errors.
- Admin TypeScript and production build succeed and metrics are backend-derived.
- Development and production Compose configurations parse with explicit validation placeholders.
- Production mobile endpoints and Nginx require secure transport; no obsolete public IP remains in active code/configuration.

## Production release blockers

1. **Database concurrency is not executed.** Docker is unavailable, so four real PostgreSQL race tests are skipped. The original three required scenarios and the added direct-vs-bid race must pass against PostgreSQL before production approval.
2. **Native/device validation is outstanding.** Android SDK configuration is invalid in this environment, iOS was not built, and neither app's complete customer/rider flow was exercised on devices.
3. **Database migration must be staged.** Production uses Hibernate `validate`; apply `infra/db/migrations/2026-09-24-release-stabilization.sql` to a backup/restorable staging copy, resolve any duplicate payment transaction IDs, then run the backend before production.
4. **Production services and credentials are external.** DNS, valid TLS certificate/key, Firebase service account, LocationIQ key, JWT secret, database, Redis, Kafka, admin credentials and payment-provider values must be provisioned and smoke-tested.
5. **Historical credential exposure needs owner confirmation.** A PEM was removed in commit `4a9613e`. If it was real, revoke/rotate it and review Git hosting/cache copies. History was intentionally not rewritten.

## Non-blocking debt

- FluxUser lint reports 45 warnings and FluxRider 48, primarily inline styles; both have zero errors.
- Admin's production JS bundle is 675.02 kB and should be code-split after stabilization.
- `JwtUtil` uses a deprecated API and the Gradle build reports future Gradle 9 incompatibilities.
- Financial entity fields still use `Double`; completion normalizes to two decimals, but a planned schema migration to `numeric`/minor units is advisable before more complex fees or refunds.
- Cross-session notification deduplication is not durable; the current bounded cache is intentionally process-local.

## Required production configuration

- Backend: `SPRING_PROFILES_ACTIVE=prod`, strong `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, database credentials, Redis/Kafka hosts, Firebase path and provider secrets.
- CORS/WebSocket: exact comma-separated HTTPS origins in `ALLOWED_ORIGINS`; never use `*` with credentials.
- Mobile: `API_BASE_URL=https://<api-host>/api`, `SOCKET_URL=https://<api-host>`, and provider keys injected at build time. Release initialization rejects missing or insecure URLs.
- Dashboard: `VITE_API_URL=https://<api-host>` at build time. `VITE_DEV_API_PROXY` is development-only.
- Compose: immutable `FLUX_IMAGE_TAG`, `DOCKER_USERNAME`, `TLS_CERT_PATH`, `TLS_KEY_PATH`, Firebase credential file, and production `.env` values.
- TLS/DNS: certificate must match the public hostname; validate HTTPS and WSS from real devices before rollout.

## Staging approval checklist

- Run `./gradlew test --tests com.flux.service.BookingConcurrencyPostgresTest --no-daemon` with Docker and confirm 4/4 pass.
- Apply the SQL migration to staging and start the production profile with schema validation.
- Build signed/staging Android and iOS apps using the exact release environment.
- Run both direct and bid lifecycle journeys, cancellation races, restart restoration, repeated completion/rating attempts and financial reconciliation.
- Test notification receipt/open/deduplication across foreground, background, process restart and reconnect.
- Test admin login, expiry, logout, role rejection, analytics totals and browser CORS over HTTPS.
- Verify Nginx HTTP redirect, certificate chain, HSTS, WSS upgrade, backend health and that port 8080 is not public.
- Confirm database backup restoration and image rollback in a non-production environment.

## Deployment sequence

1. Back up PostgreSQL and record the current immutable backend/dashboard/mobile versions.
2. Run the migration preflight on a staging copy, resolve duplicate payment transaction IDs if reported, and apply the migration transaction.
3. Build and scan the commit-SHA backend image; do not deploy an unpinned `latest` reference.
4. Deploy data dependencies, then the healthy backend, then Nginx/TLS. Validate health, schema, CORS and WSS.
5. Deploy the dashboard with its HTTPS API URL, then distribute staged mobile builds.
6. Execute the mandatory E2E matrix and reconcile booking/payment/earnings records before widening rollout.

## Rollback and recovery

- Keep the prior image tag and Compose configuration available. Roll back `FLUX_IMAGE_TAG` and recreate backend/Nginx if application smoke tests fail.
- The SQL migration adds columns/indexes and does not remove business data. Prefer forward rollback of application code; do not drop columns during an incident.
- Restore the pre-deploy database backup only when data integrity requires it and after stopping writes; coordinate any bookings created after the backup.
- Disable traffic at the proxy/load balancer during an integrity incident rather than exposing the backend port directly.
- Preserve backend/mobile logs and correlation data without logging JWTs, OTPs or service credentials.

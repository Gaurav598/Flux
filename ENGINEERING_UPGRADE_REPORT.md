# Flux Engineering Upgrade Report

## Baseline and reconciliation

This continuation uses commit `7ab4398` (`codex/release-stabilization-2026-09-23`) as its authoritative baseline. `main` and the original `codex/complete-engineering-upgrade` branch both remain at `888474f`.

The original upgrade branch contains no commit or working-tree diff beyond `888474f`; no matching stash or reflog commit was available. The stabilization commit does contain the reported upgrade artifacts, including the exception handler, conflict/not-found exceptions, booking state machine, booking/rider locks, OTP fields, safe serialization, and regression tests. The integration therefore selectively extends stabilization and does not merge or copy files from the old branch.

### Reconciliation classification

| Original upgrade area | Result |
|---|---|
| Booking owner/rider actor checks | Already implemented by stabilization and preserved |
| Client-controlled cancellation/status authority | Already implemented by stabilization and preserved |
| Booking/bid visibility | Already implemented by stabilization and preserved |
| User ID versus rider ID mapping | Already implemented by stabilization and preserved |
| Booking state machine | Already implemented by stabilization and preserved |
| Booking and rider pessimistic locks | Already implemented by stabilization and preserved |
| OTP expiry/attempt limits and hidden serialization | Already implemented by stabilization and preserved |
| Standard API exceptions | Already implemented by stabilization and preserved |
| PostgreSQL concurrency coverage | Already implemented by stabilization and preserved |
| Firebase client-phone trust | Still useful; fixed in this continuation |
| Access/refresh token separation | Still useful; fixed in this continuation |
| Notification read ownership | Still useful; fixed in this continuation |
| Deterministic user OTP creation | Obsolete/insecure; removed |
| A second state machine or alternative locking design | Incompatible/duplicate; not introduced |

## Improvements implemented in this continuation

- Access and refresh JWTs now carry and enforce distinct token types. HTTP and WebSocket authentication accept access tokens only; refresh accepts refresh tokens only. HTTP authentication also revalidates the current user identity, role, and account status.
- Firebase identity verification derives the phone number from the verified token/user record and rejects a mismatching client claim. OTP sends and verification attempts have bounded in-memory rate limits, and phone numbers are masked in service logs.
- Notification read mutation is owner-scoped.
- Native STOMP is available at `/ws-native`; connections require an access JWT. Booking status and rider-location events publish only after transaction commit. Events contain IDs and booking versions for duplicate/out-of-order suppression.
- Broker and clients use heartbeats. Mobile clients use bounded exponential reconnect with jitter and perform an authoritative REST reconciliation after every connection.
- Customer and rider history have paginated endpoints. Lifecycle timelines are derived only from persisted booking timestamps. Cancellation reasons are shown in history.
- Rider location events are throttled/validated by the existing backend and delivered only on the assigned booking topic. REST location reconciliation is participant-scoped and includes age/freshness.
- Admin analytics now expose failed bookings, user/rider cancellations, available riders, and stale available-rider locations.
- Free/demo subscriptions are idempotent. Confirmation can no longer create a subscription from a client token alone, and disabled Stripe webhooks fail explicitly rather than acknowledging unverified events.
- Free/demo activation locks the rider row, so concurrent retries serialize before checking for an existing active record.

## Architectural decisions

- The modular Spring Boot monolith remains intact. No microservice split was justified.
- The existing PostgreSQL row-lock ordering and state machine remain the source of lifecycle correctness.
- Realtime delivery is an acceleration path, not the source of truth. Clients reconcile through authenticated REST after reconnect and every 30 seconds.
- The simple STOMP broker remains single-instance only. Multi-instance realtime requires a broker relay or Redis-based fanout and is deliberately not claimed here.
- Timeline data uses persisted lifecycle timestamps, including a forward-only `rider_en_route_at` migration, rather than fabricating historical times. A future audit-grade event ledger would require a separate schema and migration plan.
- Stripe remains disabled. No live payment flow or webhook verification is claimed.

## Remaining limitations

- Mobile device/background behavior, push delivery, Firebase OTP, and native WebSocket behavior require physical-device testing.
- The PostgreSQL Testcontainers concurrency tests require Docker; they are skipped automatically when Docker is unavailable.
- OTP rate-limit state is process-local. A multi-instance deployment should move counters/session state to Redis.
- Refresh tokens are typed but are not yet rotated/revoked through a persistent token family.
- The in-memory STOMP broker is not horizontally scalable.
- Existing npm dependency trees report moderate/high transitive vulnerabilities; resolving them may require React Native dependency upgrades and was not forced during this compatibility-focused change.
- Production schema management still uses the repository's documented manual migration workflow; Hibernate is `validate` in production.

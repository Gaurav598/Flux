# API and Realtime Reference

All `/api/**` endpoints except documented authentication/public routes require `Authorization: Bearer <access-token>`. Error responses from the global handler use `status`, `error`, `message`, and `timestamp`.

## Authentication

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/verify-firebase-token` | Verify customer Firebase identity and issue typed JWTs |
| POST | `/api/auth/rider/verify-firebase-token` | Verify rider Firebase identity and issue typed JWTs |
| POST | `/api/auth/refresh` | Exchange a valid refresh token for an access token |
| POST | `/api/auth/admin/login` | Admin login; disabled when credentials are unset |

## Booking and bidding

| Method | Path | Actor / behavior |
|---|---|---|
| POST | `/api/bookings` | Customer creates one active booking |
| GET | `/api/bookings/{id}` | Booking participant or admin |
| GET | `/api/bookings/user/history?page=0&size=20` | Paginated customer history |
| GET | `/api/bookings/rider/history?page=0&size=20` | Paginated rider trip history |
| GET | `/api/bookings/{id}/timeline` | Persisted lifecycle timeline for participant/admin |
| GET | `/api/bookings/{id}/rider-location` | Participant/admin location with `recordedAt`, `ageSeconds`, `fresh` |
| POST | `/api/bookings/{id}/accept-user-price` | Eligible rider direct acceptance |
| POST | `/api/bids?bookingId=&bidAmount=` | Eligible rider bid |
| GET | `/api/bids/booking/{bookingId}` | Booking owner/admin bid list |
| POST | `/api/bids/{bidId}/accept` | Booking owner selects bid |
| POST | `/api/bookings/{id}/rider-reached` | Assigned rider; issues owner-visible OTP |
| GET | `/api/bookings/{id}/verification-otp` | Booking owner only |
| POST | `/api/bookings/{id}/verify-otp?otp=` | Assigned rider starts trip |
| POST | `/api/bookings/{id}/complete` | Assigned rider completes trip |
| POST | `/api/bookings/{id}/cancel?reason=` | Owner or assigned rider; actor is derived server-side |
| POST | `/api/bookings/{id}/rate` | Participant-specific rating fields |

Legacy unpaginated history endpoints remain available for current clients during transition.

## Notifications

- `GET /api/notifications` returns persistent newest-first history.
- `GET /api/notifications/unread-count` returns the unread count.
- `PUT /api/notifications/{id}/read` is owner-scoped.
- `PUT /api/notifications/read-all` updates only the authenticated user's records.

## Realtime

Native STOMP endpoint: `ws(s)://<host>/ws-native`  
SockJS endpoint: `http(s)://<host>/ws`

Send `Authorization: Bearer <access-token>` in STOMP CONNECT headers. Heartbeats are 10 seconds in both directions.

| Destination | Authorized subscriber | Payload |
|---|---|---|
| `/topic/user/{userId}/notifications` | Same user/admin | Notification record |
| `/topic/rider/{riderId}/bookings` | Same rider/admin | New available booking |
| `/topic/booking/{bookingId}/bids` | Booking participant/admin | Bid update |
| `/topic/booking/{bookingId}/status` | Booking participant/admin | `eventId`, `bookingId`, `status`, `version`, `updatedAt`, cancellation reason |
| `/topic/booking/{bookingId}/location` | Booking participant/admin | `eventId`, coordinates, rider/booking IDs, `recordedAt` |

Mobile reconnection starts near one second with jitter, backs off exponentially to 30 seconds, and reconciles through REST on every successful connection. Event IDs suppress duplicates; booking versions suppress older status events. A 30-second REST poll remains as a recovery path.

## Scaling note

The current simple broker is process-local. Multiple backend instances require a STOMP broker relay or another verified shared fanout mechanism plus sticky/compatible WebSocket routing. Redis/Kafka presence in Compose does not itself make STOMP delivery multi-instance.


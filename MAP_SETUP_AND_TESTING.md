# Flux map setup and device-testing guide

## Provider architecture

Both React Native applications use `react-native-maps` with the native default provider:

- Android: Google Maps SDK for Android. A valid, restricted Maps SDK key is required.
- iOS: Apple Maps. No Google Maps key or Google iOS SDK initialization is required.

`ReliableMapView` is the common safety wrapper in each application. It supplies a valid fallback viewport, keeps routing failures independent from base-map rendering, and replaces an indefinitely blank loading surface with a diagnostic after eight seconds. A generic public OpenStreetMap tile server is deliberately not embedded as an undocumented production fallback: public community tile endpoints are not an unrestricted mobile-app CDN. If Flux later needs credential-free Android maps, adopt MapLibre together with an explicitly licensed/self-hosted style and tile service as a planned native migration.

LocationIQ provides geocoding and optional route geometry/ETA. When its key is absent or routing fails, the native map and valid markers continue to work; the UI reports route/ETA unavailable rather than fabricating data.

## Environment variables

Create `mobile/FluxUser/.env` and `mobile/FluxRider/.env` from their respective `.env.example` files. Do not commit either real key.

```dotenv
API_BASE_URL=http://localhost:8080/api
SOCKET_URL=http://localhost:8080
LOCATION_IQ_API_KEY=<LocationIQ key, optional for base map>
ROUTING_API_BASE_URL=https://us1.locationiq.com/v1
GOOGLE_MAPS_API_KEY=<Android Maps SDK key>
```

Release `API_BASE_URL`, `SOCKET_URL`, and `ROUTING_API_BASE_URL` values must use HTTPS. `SOCKET_URL` is converted to `wss://` by the realtime client.

## Android setup

1. Enable Maps SDK for Android in the Google Cloud project used by Flux.
2. Create separate Android-restricted keys for the two applications where practical:
   - `com.flux.user`
   - `com.flux.rider`
3. Restrict each key to the matching package name and the SHA-1/SHA-256 certificate fingerprints for the debug or release signer being tested.
4. Put the corresponding key in that application's `.env` as `GOOGLE_MAPS_API_KEY` (or pass a Gradle property/environment variable with the same name).
5. Rebuild the native app after changing the key. Metro reload alone cannot update manifest placeholders.

Gradle reads the `.env` adjacent to each app, then injects `GOOGLE_MAPS_API_KEY` into the manifest metadata. Internet, fine-location, and coarse-location permissions are declared. Background location is not requested because Flux publishes location only while the active ride screen is mounted.

Use an emulator image with Google Play services, or a physical Android device. A key authorized for one package/signing certificate will not work in the other app.

## iOS setup

Run `pod install` in each `ios` directory after installing JavaScript dependencies. The apps intentionally use Apple Maps through the default provider, so no Google Maps iOS key is needed. Both Info.plists include a non-empty when-in-use explanation. No background-location capability is requested.

If CocoaPods state is stale, reinstall pods using the repository's normal Bundler/Pod workflow, then clean and rebuild the Xcode workspace. Test location using a simulator location or a real device.

## Permission and failure behavior

- Granted: a cached location may seed the viewport, then a balanced, foreground watch updates it.
- Denied/restricted: iOS offers Settings; Android reports that location access is unavailable. Maps retain a safe Delhi viewport rather than receiving invalid coordinates.
- Location temporarily unavailable or disabled: the previous valid location/default viewport remains visible and the error callback is non-fatal.
- Malformed coordinates: latitude outside `[-90, 90]`, longitude outside `[-180, 180]`, non-finite values, malformed route points, and implausible jumps above 100 m/s are ignored.

## Routing and realtime behavior

Routing calls use the configured HTTPS LocationIQ base URL and are throttled in active tracking. Missing credentials, timeouts, malformed geometry, and no-route responses clear the polyline without blanking the map. ETA appears only for a successful route based on rider location no older than 30 seconds.

Customer tracking loads the authoritative booking and participant-scoped `GET /api/bookings/{id}/rider-location`, then subscribes once to `/topic/booking/{id}/location` using an authenticated native STOMP connection. Older/equal location timestamps are dropped. A reconnect reloads booking and location state; a 30-second REST poll is retained as recovery. The UI distinguishes live, stale, and reconnecting state.

Rider tracking uses a foreground 30-second/50-metre watch, rejects implausible jumps, and publishes valid coordinates to `PATCH /api/rider/location`. The watcher is stopped on screen unmount, booking cancellation, trip completion, or an authoritative terminal state.

## Manual verification

Repeat the following on an Android emulator/device and an iOS simulator/device for both debug and intended release configuration:

1. Launch FluxUser with location granted. Confirm a map, current-position marker, nearby valid rider markers, pan/zoom gestures, and recenter control.
2. Deny location, relaunch, and confirm a usable fallback map plus permission guidance rather than a blank screen. On iOS, confirm the Settings action. Disable device location and confirm failure remains non-fatal.
3. Select pickup/drop and continue to fare selection. Confirm both markers and camera bounds. With LocationIQ configured, confirm the route and provider-derived duration. Remove/invalid the routing key and confirm markers remain with “Route unavailable.”
4. Create a booking and assign a rider. Confirm FluxUser shows the rider marker, live/reconnecting/stale label, and no invented ETA.
5. Toggle network off for more than 30 seconds, move the rider, then restore it. Confirm reconnect reconciliation jumps to the newest authoritative location and an older event does not move the marker backward.
6. Launch FluxRider, grant permission, open available bookings, and verify only valid pickup/drop bookings render and fit correctly.
7. Accept a ride. Confirm the route targets pickup before OTP and drop after trip start. Pan the map and verify GPS updates do not constantly steal the camera.
8. Cancel one ride and complete another. Confirm the location indicator stops and no further rider-location requests are emitted after leaving the tracking screen.
9. Verify the “Open Navigation” deep link on both platforms with zero and ordinary valid coordinates, and confirm invalid coordinates do not open another app.
10. Wait with an invalid/missing Android map key. Confirm the explicit delayed diagnostic appears. Restore a correctly restricted key, rebuild, and confirm tiles render.

## Troubleshooting

- Android diagnostic remains after rebuild: verify Maps SDK enablement, package name, signing fingerprint, billing/project status, Google Play services, network, and that the key is in the correct application's `.env`.
- iOS blank tiles: confirm the app is built from the `.xcworkspace`, network is available, and Apple Maps works on the device/simulator.
- Markers but no polyline: verify `LOCATION_IQ_API_KEY`, HTTPS `ROUTING_API_BASE_URL`, quota, and that pickup/drop are valid and routable.
- Realtime remains reconnecting: verify `SOCKET_URL`, JWT access token, WebSocket origin configuration, and `/ws-native` reachability. The 30-second REST reconciliation should continue.
- Native configuration changes do not appear: stop Metro, clean/rebuild the native target, and do not rely on Fast Refresh for manifest or plist changes.

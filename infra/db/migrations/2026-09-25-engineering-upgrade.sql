BEGIN;

-- Persist the en-route lifecycle transition so timelines never infer a timestamp.
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS rider_en_route_at timestamp;

COMMIT;

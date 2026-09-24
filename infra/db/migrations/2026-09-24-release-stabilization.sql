BEGIN;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS verification_otp_expires_at timestamp;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS verification_otp_attempts integer DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS version bigint;

UPDATE bookings
SET verification_otp_attempts = 0
WHERE verification_otp_attempts IS NULL;

UPDATE bookings
SET version = 0
WHERE version IS NULL;

ALTER TABLE bookings ALTER COLUMN version SET DEFAULT 0;
ALTER TABLE bookings ALTER COLUMN version SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_user_status
    ON bookings (user_id, status);
CREATE INDEX IF NOT EXISTS idx_booking_rider_status
    ON bookings (rider_id, status);
CREATE INDEX IF NOT EXISTS idx_booking_status_bidding_end
    ON bookings (status, bidding_end_time);
CREATE INDEX IF NOT EXISTS idx_payment_rider_created
    ON payments (rider_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_status
    ON payments (status);

DO $$
BEGIN
    IF EXISTS (
        SELECT transaction_id
        FROM payments
        WHERE transaction_id IS NOT NULL
        GROUP BY transaction_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate payment transaction_id values must be resolved before migration';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uk_payment_transaction
    ON payments (transaction_id);

COMMIT;

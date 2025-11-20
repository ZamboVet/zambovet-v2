-- Normalize appointment status values and add a constraint to prevent drift
-- Safe to run multiple times
BEGIN;

-- 1) Normalize spelling: `canceled` -> `cancelled`
UPDATE appointments
SET status = 'cancelled'
WHERE status = 'canceled';

-- 2) Optional: trim/normalize casing (defensive)
UPDATE appointments
SET status = LOWER(TRIM(status));

-- 3) Enforce allowed values via CHECK constraint
--    Allowed set mirrors app logic: pending, confirmed, in_progress, completed, cancelled
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled'));

COMMIT;

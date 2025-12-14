-- Migration: Add unique constraint for appointment slots
-- Purpose: Prevent double-booking by ensuring only one active appointment per vet/date/time
-- This fixes the race condition where two users could book the same slot simultaneously

-- Step 1: Create a partial unique index that only applies to non-cancelled appointments
-- This allows cancelled appointments to exist at the same slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique_slot 
ON appointments (veterinarian_id, appointment_date, appointment_time)
WHERE status NOT IN ('cancelled');

-- Step 2: Add a comment explaining the constraint
COMMENT ON INDEX idx_appointments_unique_slot IS 
'Prevents double-booking: only one active (non-cancelled) appointment per vet/date/time slot';

-- Note: If you have existing duplicate bookings, you'll need to resolve them first.
-- Run this query to find duplicates:
-- 
-- SELECT veterinarian_id, appointment_date, appointment_time, COUNT(*) as count
-- FROM appointments
-- WHERE status NOT IN ('cancelled')
-- GROUP BY veterinarian_id, appointment_date, appointment_time
-- HAVING COUNT(*) > 1;
--
-- Then manually cancel or reschedule the duplicates before applying this migration.

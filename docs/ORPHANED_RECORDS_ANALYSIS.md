# Orphaned Records Analysis: Pet & Medical Records

## Status: ⚠️ VULNERABLE (Fix Available)

The database currently **lacks CASCADE DELETE constraints**, which means deleting a user profile leaves behind orphaned pet and medical records. However, the application has **manual cleanup logic** as a workaround.

## What is the Orphaned Record Bug?

When a user deletes their account, related data (pets, appointments, medical records) should also be deleted. Without proper database constraints, this data becomes "orphaned" - it exists in the database but has no owner.

**Problems:**
- ❌ Accumulates "dead data" in the database
- ❌ Wastes storage space
- ❌ Potential privacy/GDPR violations
- ❌ Database integrity issues
- ❌ Difficult to maintain referential integrity

## Current Implementation Analysis

### Database Schema (Current State)

**Location:** `@/supabase_schema.sql`

**Foreign Key Constraints (WITHOUT CASCADE):**

```sql
-- Patients table
CONSTRAINT patients_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES public.pet_owner_profiles(id)
-- ❌ NO CASCADE DELETE

-- Appointments table
CONSTRAINT appointments_pet_owner_id_fkey 
FOREIGN KEY (pet_owner_id) REFERENCES public.pet_owner_profiles(id)
-- ❌ NO CASCADE DELETE

CONSTRAINT appointments_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id)
-- ❌ NO CASCADE DELETE

-- Pet Diary Entries
CONSTRAINT pet_diary_entries_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id)
-- ❌ NO CASCADE DELETE

-- Consultations
CONSTRAINT consultations_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id)
-- ❌ NO CASCADE DELETE

-- And many more...
```

**Result:** If a user is deleted, all their pets, appointments, diary entries, consultations, and medical records remain in the database as orphaned records.

### Application-Level Cleanup (Workaround)

**Location:** `@/app/api/delete-account/route.ts`

The application implements **manual cleanup** in the delete account API:

```typescript
// Step 1: Find owner profile
const { data: ownerRow } = await admin
  .from('pet_owner_profiles')
  .select('id')
  .eq('user_id', userId)
  .maybeSingle();

// Step 2: Delete appointments and consultations
const { data: appts } = await admin
  .from('appointments')
  .select('id')
  .eq('pet_owner_id', ownerId);

// Step 3: Delete consultation sub-records
await admin.from('consultation_attachments').delete().in('consultation_id', cIds);
await admin.from('consultation_diagnoses').delete().in('consultation_id', cIds);
await admin.from('consultation_labs').delete().in('consultation_id', cIds);
await admin.from('consultation_prescriptions').delete().in('consultation_id', cIds);

// Step 4: Delete patient records
await admin.from('pet_health_metrics').delete().in('patient_id', pIds);
await admin.from('pet_medication_schedule').delete().in('patient_id', pIds);

// Step 5: Delete diary entries and photos
await admin.from('pet_diary_photos').delete().in('diary_entry_id', dIds);
await admin.from('pet_diary_entries').delete().in('id', dIds);

// Step 6: Delete social features
await admin.from('pet_post_media').delete().in('post_id', postIds);
await admin.from('pet_post_comments').delete().in('post_id', postIds);
await admin.from('pet_post_reactions').delete().in('post_id', postIds);
await admin.from('pet_posts').delete().in('id', postIds);

// Step 7: Delete reviews and follows
await admin.from('reviews').delete().eq('pet_owner_id', ownerId);
await admin.from('owner_follows').delete().or(`follower_owner_id.eq.${ownerId}...`);

// Step 8: Delete patients
await admin.from('patients').delete().in('id', pIds);

// Step 9: Delete owner profile
await admin.from('pet_owner_profiles').delete().eq('id', ownerId);

// Step 10: Delete auth user
await admin.auth.admin.deleteUser(userId);
```

**Analysis:**
- ✅ Comprehensive manual cleanup (60+ lines of code)
- ✅ Handles all related tables
- ✅ Uses try-catch to prevent failures
- ⚠️ **Fragile** - must be updated when schema changes
- ⚠️ **Error-prone** - easy to miss new tables
- ⚠️ **Not atomic** - partial failures leave orphaned data
- ⚠️ **Only works through API** - direct database deletes bypass this logic

## Vulnerability Scenarios

### Scenario 1: Direct Database Deletion

**Action:** Admin deletes user directly in Supabase dashboard

**Result:**
```sql
DELETE FROM profiles WHERE id = 'user-123';
-- ✅ User deleted
-- ❌ pet_owner_profiles remains (orphaned)
-- ❌ patients remain (orphaned)
-- ❌ appointments remain (orphaned)
-- ❌ consultations remain (orphaned)
-- ❌ pet_diary_entries remain (orphaned)
-- ❌ All medical records remain (orphaned)
```

**Impact:** Massive data accumulation, privacy violations

### Scenario 2: API Failure Mid-Deletion

**Action:** User deletes account, but API fails halfway through

**Result:**
```typescript
// Step 1-5: Success ✓
await admin.from('pet_health_metrics').delete()... // ✓
await admin.from('pet_medication_schedule').delete()... // ✓

// Step 6: Network error ✗
await admin.from('pet_diary_photos').delete()... // FAILS

// Step 7-10: Never executed
// Result: Partial deletion, orphaned records remain
```

**Impact:** Inconsistent state, orphaned data

### Scenario 3: Schema Changes

**Action:** Developer adds new table `pet_vaccinations` with foreign key to `patients`

**Result:**
```typescript
// delete-account API doesn't know about new table
await admin.from('patients').delete().in('id', pIds);
// ❌ Fails because pet_vaccinations still references patients
// OR
// ✅ Succeeds but pet_vaccinations records are orphaned
```

**Impact:** Deletion fails or creates orphaned records

### Scenario 4: Supabase Auth Deletion

**Action:** User deleted via Supabase Auth dashboard

**Result:**
```
auth.users deleted
  ↓
profiles deleted (if CASCADE from auth.users)
  ↓
❌ pet_owner_profiles orphaned
❌ All related data orphaned
```

**Impact:** Complete data orphaning

## Recommended Solution: Database CASCADE DELETE

### Migration File Created

**Location:** `@/supabase_migrations/add_cascade_delete_constraints.sql`

**Key Changes:**

```sql
-- Drop existing constraints
ALTER TABLE public.patients
DROP CONSTRAINT IF EXISTS patients_owner_id_fkey;

-- Add CASCADE DELETE constraint
ALTER TABLE public.patients
ADD CONSTRAINT patients_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES public.pet_owner_profiles(id) 
ON DELETE CASCADE;
```

**Cascade Chain:**

```
profiles (user deleted)
  ↓ CASCADE
pet_owner_profiles
  ↓ CASCADE
├── patients
│   ↓ CASCADE
│   ├── appointments
│   │   ↓ CASCADE
│   │   ├── consultations
│   │   │   ↓ CASCADE
│   │   │   ├── consultation_attachments
│   │   │   ├── consultation_diagnoses
│   │   │   ├── consultation_labs
│   │   │   ├── consultation_prescriptions
│   │   │   └── consultation_vitals
│   │   └── notifications (SET NULL)
│   ├── pet_diary_entries
│   │   ↓ CASCADE
│   │   └── pet_diary_photos
│   ├── pet_health_metrics
│   ├── pet_medication_schedule
│   └── pet_posts (SET NULL on patient_id)
├── appointments
├── pet_diary_entries
├── pet_posts
│   ↓ CASCADE
│   ├── pet_post_media
│   ├── pet_post_comments
│   └── pet_post_reactions
├── pet_post_comments (as author)
├── pet_post_reactions (as author)
├── reviews
└── owner_follows
```

**Benefits:**
- ✅ Automatic cleanup at database level
- ✅ Atomic operation (all or nothing)
- ✅ Works regardless of deletion method
- ✅ No application code needed
- ✅ Schema-aware (database enforces integrity)
- ✅ Prevents orphaned records completely

## Comparison: Manual vs CASCADE

### Manual Cleanup (Current)

```typescript
// 60+ lines of code
try { await admin.from('table1').delete()... } catch {}
try { await admin.from('table2').delete()... } catch {}
try { await admin.from('table3').delete()... } catch {}
// ... 20+ more tables
```

**Pros:**
- ✅ Works with current schema
- ✅ Can add custom logic

**Cons:**
- ❌ Fragile (breaks when schema changes)
- ❌ Error-prone (easy to miss tables)
- ❌ Not atomic (partial failures)
- ❌ Only works through API
- ❌ Requires maintenance

### CASCADE DELETE (Recommended)

```sql
-- One-time migration
ALTER TABLE patients
ADD CONSTRAINT patients_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES pet_owner_profiles(id) 
ON DELETE CASCADE;
```

**Pros:**
- ✅ Automatic and reliable
- ✅ Atomic (all or nothing)
- ✅ Works from any deletion method
- ✅ Self-maintaining
- ✅ Database-enforced integrity

**Cons:**
- ⚠️ Requires migration
- ⚠️ Must be careful with SET NULL vs CASCADE

## Migration Strategy

### Step 1: Backup Database

```bash
# Create full database backup before migration
pg_dump -h your-db-host -U postgres -d your-db > backup_before_cascade.sql
```

### Step 2: Check for Existing Orphaned Records

```sql
-- Find orphaned patients (owner doesn't exist)
SELECT p.id, p.name, p.owner_id
FROM patients p
LEFT JOIN pet_owner_profiles pop ON p.owner_id = pop.id
WHERE pop.id IS NULL;

-- Find orphaned appointments (owner doesn't exist)
SELECT a.id, a.appointment_date, a.pet_owner_id
FROM appointments a
LEFT JOIN pet_owner_profiles pop ON a.pet_owner_id = pop.id
WHERE pop.id IS NULL;

-- Find orphaned diary entries (patient doesn't exist)
SELECT pde.id, pde.title, pde.patient_id
FROM pet_diary_entries pde
LEFT JOIN patients p ON pde.patient_id = p.id
WHERE p.id IS NULL;
```

### Step 3: Clean Up Orphaned Records

```sql
-- Delete orphaned patients
DELETE FROM patients
WHERE owner_id NOT IN (SELECT id FROM pet_owner_profiles);

-- Delete orphaned appointments
DELETE FROM appointments
WHERE pet_owner_id NOT IN (SELECT id FROM pet_owner_profiles);

-- Delete orphaned diary entries
DELETE FROM pet_diary_entries
WHERE patient_id NOT IN (SELECT id FROM patients);
```

### Step 4: Apply Migration

```bash
# Apply the cascade delete migration
psql -h your-db-host -U postgres -d your-db -f supabase_migrations/add_cascade_delete_constraints.sql
```

### Step 5: Verify Migration

```sql
-- Check foreign keys have CASCADE
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND rc.delete_rule = 'CASCADE'
ORDER BY tc.table_name;
```

### Step 6: Test CASCADE DELETE

```sql
-- Test in transaction (will rollback)
BEGIN;

-- Create test user
INSERT INTO profiles (id, email, full_name, user_role)
VALUES ('test-user-123', 'test@example.com', 'Test User', 'pet_owner');

-- Create test owner profile
INSERT INTO pet_owner_profiles (user_id, full_name)
VALUES ('test-user-123', 'Test Owner')
RETURNING id; -- Note this ID

-- Create test patient
INSERT INTO patients (owner_id, name, species)
VALUES (123, 'Test Pet', 'Dog'); -- Use owner ID from above

-- Verify records exist
SELECT COUNT(*) FROM patients WHERE owner_id = 123;
SELECT COUNT(*) FROM pet_owner_profiles WHERE id = 123;

-- Delete user (should CASCADE)
DELETE FROM profiles WHERE id = 'test-user-123';

-- Verify CASCADE worked
SELECT COUNT(*) FROM patients WHERE owner_id = 123; -- Should be 0
SELECT COUNT(*) FROM pet_owner_profiles WHERE id = 123; -- Should be 0

ROLLBACK; -- Don't commit test data
```

### Step 7: Simplify Application Code

After migration, the delete account API can be simplified:

```typescript
// BEFORE: 60+ lines of manual cleanup
// AFTER: Just delete the user
const { error } = await admin.auth.admin.deleteUser(userId);
// Database CASCADE handles everything automatically
```

## Data Retention Considerations

### CASCADE vs SET NULL

**CASCADE DELETE:** Child records are deleted
```sql
FOREIGN KEY (owner_id) REFERENCES pet_owner_profiles(id) ON DELETE CASCADE
-- When owner deleted → pets deleted
```

**SET NULL:** Child records kept, foreign key set to NULL
```sql
FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
-- When appointment deleted → diary entry kept, appointment_id = NULL
```

**Recommendations:**

| Table | Action | Reason |
|-------|--------|--------|
| `patients` | CASCADE | Pets belong to owner |
| `appointments` | CASCADE | Appointments belong to owner/pet |
| `consultations` | CASCADE | Medical records belong to appointment |
| `pet_diary_entries` | CASCADE | Diary belongs to pet/owner |
| `pet_health_metrics` | CASCADE | Metrics belong to pet |
| `pet_posts` | CASCADE | Posts belong to owner |
| `reviews` | CASCADE | Reviews belong to owner |
| `notifications` | CASCADE | Notifications belong to user |
| `pet_posts.patient_id` | SET NULL | Keep post if pet deleted |
| `pet_diary_entries.appointment_id` | SET NULL | Keep diary if appointment deleted |
| `reviews.appointment_id` | SET NULL | Keep review if appointment deleted |

## GDPR Compliance

### Right to Erasure (Right to be Forgotten)

**GDPR Article 17:** Users have the right to request deletion of their personal data.

**With CASCADE DELETE:**
- ✅ User deletion removes all personal data
- ✅ Automatic and complete
- ✅ Audit trail possible (log deletions)
- ✅ Compliant with GDPR

**Without CASCADE DELETE:**
- ❌ Manual cleanup required
- ❌ Risk of incomplete deletion
- ❌ Potential GDPR violations
- ❌ Privacy concerns

### Data Retention Policy

**Recommended:**
```sql
-- Keep anonymized analytics (no personal data)
CREATE TABLE deleted_user_analytics (
  deleted_at TIMESTAMP,
  user_role TEXT,
  account_age_days INTEGER,
  total_appointments INTEGER,
  total_pets INTEGER
);

-- Trigger on user deletion to save analytics
CREATE OR REPLACE FUNCTION log_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO deleted_user_analytics (...)
  SELECT NOW(), OLD.user_role, ...
  FROM pet_owner_profiles WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_deletion_analytics
BEFORE DELETE ON profiles
FOR EACH ROW EXECUTE FUNCTION log_user_deletion();
```

## Summary

⚠️ **Current Status: VULNERABLE**

**Problems:**
- ❌ No CASCADE DELETE constraints
- ❌ Manual cleanup in application (fragile)
- ❌ Risk of orphaned records
- ❌ Privacy/GDPR concerns
- ❌ Database integrity issues

**Solution Available:**
- ✅ Migration file created: `add_cascade_delete_constraints.sql`
- ✅ Comprehensive CASCADE DELETE constraints
- ✅ Proper SET NULL where appropriate
- ✅ Comments and documentation
- ✅ Verification queries included

**Recommendation:**
1. Backup database
2. Clean existing orphaned records
3. Apply CASCADE DELETE migration
4. Test thoroughly
5. Simplify application code
6. Monitor for issues

**Files Created:**
- `@/supabase_migrations/add_cascade_delete_constraints.sql` - Migration to fix orphaned records
- `@/docs/ORPHANED_RECORDS_ANALYSIS.md` - This comprehensive analysis

**Next Steps:**
Apply the migration to prevent orphaned records and ensure GDPR compliance.

# Notifications Table Schema Check

## Issue
The `notifications` table is missing `type` and `is_read` columns.

## Solution Applied
Added `type` and `is_read` fields to the insert statement.
Now using columns that exist: `user_id`, `title`, `message`, `type`, `is_read`.

## Current Insert Statement (UPDATED)
```typescript
const { error } = await supabase
  .from('notifications')
  .insert({
    user_id: user.id,
    title: 'Veterinarian Approval Request',
    message: `${profile?.full_name || 'A veterinarian'} (${profile?.email}) has requested approval for their account.`,
    type: 'approval_request',
    is_read: false,
  });
```

## Required Columns in notifications table (ACTUAL)
- `user_id` (UUID, FK to auth.users) 
- `title` (VARCHAR) 
- `message` (TEXT) 
- `type` (VARCHAR) 
- `is_read` (BOOLEAN) 

## Removed Columns (not in schema)
- `recipient_role` (VARCHAR) 

## Optional Columns (if they exist)
- `id` (BIGSERIAL PRIMARY KEY) - auto-generated
- `created_at` (TIMESTAMP) - auto-generated

## To Verify in Supabase
1. Go to Supabase Dashboard
2. Click on "SQL Editor"
3. Run this query:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;
```

## If notifications table doesn't exist
Create it with:
```sql
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
```

## Testing the Fix
1. Go to `/veterinarian` as a pending vet
2. Click "Request Approval" button
3. Check if notification appears in database:
```sql
SELECT * FROM notifications 
WHERE type = 'approval_request' 
ORDER BY created_at DESC 
LIMIT 1;
```

## Status
✅ Fixed - Removed all non-existent columns
✅ Now using only: user_id, title, message
✅ Ready to test

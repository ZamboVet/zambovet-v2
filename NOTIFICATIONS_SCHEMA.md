# Notifications Table Schema - Final

## Issue Resolution
The `notifications` table column is named `notification_type` (NOT `type`) and it's NOT NULL.

## Final Insert Statement
```typescript
const { error } = await supabase
  .from('notifications')
  .insert({
    notification_type: 'approval_request',
    user_id: user.id,
    title: 'Veterinarian Approval Request',
    message: `${profile?.full_name || 'A veterinarian'} (${profile?.email}) has requested approval for their account.`,
  });
```

## Required Columns
- ✅ `notification_type` (VARCHAR, NOT NULL) - Must provide value
- ✅ `user_id` (UUID, FK to auth.users)
- ✅ `title` (VARCHAR)
- ✅ `message` (TEXT)

## Optional Columns (auto-generated)
- `id` (BIGSERIAL PRIMARY KEY)
- `created_at` (TIMESTAMP DEFAULT NOW())

## Testing
1. Go to `/veterinarian` as a pending vet
2. Click "Request Approval" button
3. Should now work without errors
4. Check database:
```sql
SELECT * FROM notifications 
ORDER BY created_at DESC 
LIMIT 1;
```

## Status
✅ FIXED - notification_type column added
✅ READY TO TEST

# Troubleshooting: Approval Requests Not Showing

## Issue
Vet sent approval request but nothing shows in admin notifications page.

---

## Step 1: Check Browser Console

1. Go to `/admin/notifications`
2. Open DevTools (F12)
3. Go to Console tab
4. Look for these logs:
   - `Loading notifications...`
   - `Fetching notifications...`
   - `Notifications fetched: [...]`
   - `Vet profiles loaded: {...}`

**If you see these logs:**
- Notifications are being fetched
- Check if the array is empty `[]`

**If you don't see these logs:**
- Page might not be loading correctly
- Try refreshing the page

---

## Step 2: Check Database Directly

Go to **Supabase Dashboard** and run this query:

```sql
SELECT * FROM notifications 
ORDER BY created_at DESC;
```

**Expected result:**
- Should see at least one row
- `notification_type` = 'approval_request'
- `user_id` = vet's user ID
- `title` = 'Veterinarian Approval Request'
- `message` = contains vet name and email

**If no rows:**
- Approval request was never saved
- Check if vet got error when clicking "Request Approval"

**If rows exist:**
- Notifications are in database
- Issue is with fetching/displaying

---

## Step 3: Check Vet Profile

Run this query in Supabase:

```sql
SELECT id, full_name, email, verification_status, user_role
FROM profiles
WHERE user_role = 'veterinarian'
AND verification_status = 'pending'
ORDER BY created_at DESC;
```

**Expected result:**
- Should see pending vet accounts
- Match the `user_id` from notifications table

**If no results:**
- No pending vets in system
- Create a test pending vet account

---

## Step 4: Check Notification Query

The admin page queries for `notification_type = 'approval_request'`.

Run this in Supabase:

```sql
SELECT * FROM notifications 
WHERE notification_type = 'approval_request'
ORDER BY created_at DESC;
```

**If empty:**
- Notifications exist but have different type
- Check what `notification_type` values exist:

```sql
SELECT DISTINCT notification_type FROM notifications;
```

---

## Step 5: Manual Test

### Create Test Notification

Run this in Supabase SQL Editor:

```sql
INSERT INTO notifications (user_id, title, message, notification_type)
VALUES (
  'YOUR_VET_USER_ID_HERE',
  'Veterinarian Approval Request',
  'Test Veterinarian (test@example.com) has requested approval for their account.',
  'approval_request'
);
```

Replace `YOUR_VET_USER_ID_HERE` with an actual vet's user ID.

Then:
1. Go to `/admin/notifications`
2. Click Refresh button
3. Should see the test notification

---

## Step 6: Check Vet's Request

Ask the vet to:
1. Go to `/veterinarian`
2. Check if they see the yellow "Account Pending Approval" banner
3. Click "Request Approval" button
4. Check if they see success message

**If they see error:**
- Check browser console for error message
- Error message will indicate what's wrong

---

## Common Issues & Solutions

### Issue: "No approval requests" but vet sent request

**Possible causes:**
1. Notification saved with wrong `notification_type`
2. Notification saved with different user_id
3. Database query not matching

**Solution:**
```sql
-- Check all notifications
SELECT * FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- Check if notification_type is correct
SELECT DISTINCT notification_type FROM notifications;
```

---

### Issue: Vet got error when clicking "Request Approval"

**Check vet's browser console for error message**

Common errors:
- `notification_type column not found` → Column name mismatch
- `null value in column` → Missing required field
- `FK violation` → Invalid user_id

**Solution:**
- Check `lib/utils/vetAccessControl.ts` line 90
- Verify all required columns are being inserted

---

### Issue: Admin page shows loading forever

**Possible causes:**
1. Database query hanging
2. Network issue
3. Supabase connection problem

**Solution:**
1. Check browser console for errors
2. Try refreshing page
3. Check Supabase status page
4. Try accessing other admin pages

---

## Debug Checklist

- [ ] Vet clicked "Request Approval" button
- [ ] Vet saw success message (or check console for error)
- [ ] Notification exists in database (check SQL query)
- [ ] Notification has correct `notification_type = 'approval_request'`
- [ ] Vet profile exists with matching `user_id`
- [ ] Admin page loads without errors (check console)
- [ ] Refresh button works
- [ ] Test notification appears after manual insert

---

## Quick Fix Steps

If notifications still not showing:

1. **Clear browser cache**
   - Ctrl+Shift+Delete (Windows/Linux)
   - Cmd+Shift+Delete (Mac)

2. **Hard refresh page**
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)

3. **Check Supabase connection**
   - Go to any other admin page
   - If it loads, connection is fine

4. **Verify database**
   - Run SQL query in Supabase
   - Check if notification exists

5. **Check browser console**
   - Open DevTools (F12)
   - Look for error messages
   - Share error with support

---

## Getting Help

If still not working, provide:
1. Screenshot of admin notifications page
2. Browser console errors (if any)
3. Result of this SQL query:
   ```sql
   SELECT * FROM notifications 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
4. Result of this SQL query:
   ```sql
   SELECT id, full_name, email, verification_status 
   FROM profiles 
   WHERE user_role = 'veterinarian' 
   LIMIT 5;
   ```

---

## Status

✅ Debugging logs added to admin page
✅ Console will show what's being fetched
✅ Can now trace issue step by step

# Push Notifications Audit Report

**Date**: November 23, 2025  
**Status**: ⚠️ Partially Implemented - Missing Critical Steps

---

## Executive Summary

Push notification infrastructure is **80% built** but **not functional** because:
1. ❌ Database table not created
2. ❌ Package not installed
3. ⚠️ Firebase integration incomplete
4. ❌ No triggers in appointment/moments pages
5. ✅ Web service worker created

---

## Detailed Audit Results

### ✅ **Completed Components**

| Component | Status | Location |
|-----------|--------|----------|
| Service layer | ✅ | `lib/services/pushNotificationService.ts` |
| React hook | ✅ | `lib/hooks/usePushNotifications.ts` |
| API endpoint | ⚠️ Partial | `app/api/send-push-notification/route.ts` |
| NotificationsBell integration | ✅ | `app/pet_owner/components/NotificationsBell.tsx` |
| Web service worker | ✅ | `public/sw.js` (just created) |
| Google services config | ✅ | `android/app/google-services.json` |
| Migration file | ✅ | `migrations/add_device_tokens.sql` |

### ❌ **Missing/Incomplete Components**

| Issue | Impact | Fix |
|-------|--------|-----|
| Database table not created | 🔴 Critical | Run migration in Supabase |
| Package not installed | 🔴 Critical | `npm install @capacitor/push-notifications` |
| Firebase JWT signing | 🟡 High | Install `jsonwebtoken` package |
| No appointment triggers | 🟡 High | Add API calls in appointments page |
| No moments triggers | 🟡 High | Add API calls in moments page |
| VAPID keys not set | 🟡 High | Generate and add to `.env.local` |

---

## Step-by-Step Fix Plan

### **Phase 1: Critical Setup (Do First)**

#### Step 1.1: Create Database Table
```bash
# Go to Supabase Dashboard → SQL Editor
# Copy entire contents from: migrations/add_device_tokens.sql
# Paste and execute
```

**Verify**: In Supabase, run:
```sql
SELECT * FROM device_tokens LIMIT 1;
-- Should return empty table (no error)
```

#### Step 1.2: Install Required Packages
```bash
npm install @capacitor/push-notifications jsonwebtoken
npm install --save-dev @types/jsonwebtoken
npx cap sync
```

**Verify**:
```bash
npm list @capacitor/push-notifications jsonwebtoken
```

#### Step 1.3: Update API Endpoint with JWT Signing
The API endpoint needs proper JWT signing. Update it:

```typescript
// In app/api/send-push-notification/route.ts
import jwt from 'jsonwebtoken';

// Replace createJWT function with:
function createJWT(header: any, payload: any, privateKey: string): string {
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    header: header,
  });
}
```

---

### **Phase 2: Integration (Add Triggers)**

#### Step 2.1: Add Appointment Notification Trigger

In `app/veterinarian/appointments/page.tsx`, find the `updateStatus` function and add after the database update:

```typescript
// After: const { error } = await supabase.from("appointments").update({ status: next }).eq("id", id);

// Add this:
try {
  const apptItem = items.find(it => it.id === id);
  if (apptItem?.pet_owner_id) {
    const { data: ownerData } = await supabase
      .from('pet_owner_profiles')
      .select('user_id')
      .eq('id', apptItem.pet_owner_id)
      .maybeSingle();
    
    const ownerUserId = (ownerData as any)?.user_id;
    if (ownerUserId) {
      const statusText = next === 'confirmed' ? '✨ Confirmed!' : next.replace('_', ' ');
      await fetch('/api/send-push-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: ownerUserId,
          title: `Appointment ${statusText}`,
          message: `Your appointment #${id} status: ${next}`,
          data: { appointmentId: id },
          notificationType: `appointment_${next}`
        })
      });
    }
  }
} catch (err) {
  console.error('Failed to send push notification:', err);
}
```

#### Step 2.2: Add Moments Comment Notification Trigger

In `app/pet_owner/moments/page.tsx`, find the `addComment` function and add after inserting the comment:

```typescript
// After: await supabase.from("pet_post_comments").insert({ ... });

// Add this:
try {
  const thePost = posts.find(p => p.id === postId);
  if (thePost && thePost.pet_owner_id !== owner.id) {
    const { data: target } = await supabase
      .from('pet_owner_profiles')
      .select('user_id, full_name')
      .eq('id', thePost.pet_owner_id)
      .maybeSingle();
    
    const targetUid = (target as any)?.user_id;
    if (targetUid) {
      await fetch('/api/send-push-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUid,
          title: '💬 New comment on your post',
          message: `${(owner as any)?.full_name || 'Someone'} commented`,
          data: { postId: postId },
          notificationType: 'moment_comment'
        })
      });
    }
  }
} catch (err) {
  console.error('Failed to send push notification:', err);
}
```

#### Step 2.3: Add Moments Reaction Notification Trigger

In `app/pet_owner/moments/page.tsx`, find the `toggleLike` function and add after updating the reaction:

```typescript
// After: await supabase.from("pet_post_reactions").upsert({ ... });

// Add this:
try {
  if (thePost && thePost.pet_owner_id !== me) {
    const { data: target } = await supabase
      .from('pet_owner_profiles')
      .select('user_id')
      .eq('id', thePost.pet_owner_id)
      .maybeSingle();
    
    const targetUid = (target as any)?.user_id;
    if (targetUid) {
      await fetch('/api/send-push-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUid,
          title: '👍 Someone liked your post',
          message: 'Your post got a new reaction',
          data: { postId: postId },
          notificationType: 'moment_reaction'
        })
      });
    }
  }
} catch (err) {
  console.error('Failed to send push notification:', err);
}
```

---

### **Phase 3: Testing**

#### Step 3.1: Verify Device Token Registration
```bash
# 1. Open app in browser
# 2. Check browser console for: "Push notification token received: ..."
# 3. In Supabase, run:
SELECT * FROM device_tokens WHERE is_active = true;
# Should show your device token
```

#### Step 3.2: Test Appointment Notification
```bash
# 1. Go to /veterinarian/appointments
# 2. Change an appointment status to "confirmed"
# 3. Check browser console for API call
# 4. Check Supabase logs for notification sent
```

#### Step 3.3: Test Moments Notification
```bash
# 1. Go to /pet_owner/moments
# 2. Add a comment to someone else's post
# 3. Check browser console for API call
# 4. Check Supabase logs for notification sent
```

---

## Current Issues & Solutions

### **Issue 1: "Nothing shows here"**
**Cause**: Device tokens not being registered because:
- Database table doesn't exist
- Package not installed
- Hook can't connect to Capacitor/Web Push

**Solution**: Complete Phase 1 above

### **Issue 2: Notifications not sent**
**Cause**: No triggers calling the API endpoint

**Solution**: Complete Phase 2 above

### **Issue 3: Firebase errors**
**Cause**: JWT signing not implemented properly

**Solution**: Install `jsonwebtoken` and update API endpoint

---

## Files Modified/Created

### **New Files**
- ✅ `public/sw.js` - Web service worker
- ✅ `migrations/add_device_tokens.sql` - Database schema
- ✅ `lib/services/pushNotificationService.ts` - Service functions
- ✅ `lib/hooks/usePushNotifications.ts` - React hook
- ✅ `app/api/send-push-notification/route.ts` - API endpoint
- ✅ `android/app/google-services.json` - Firebase config

### **Modified Files**
- ✅ `app/pet_owner/components/NotificationsBell.tsx` - Added hook

### **To Modify**
- ⏳ `app/veterinarian/appointments/page.tsx` - Add appointment trigger
- ⏳ `app/pet_owner/moments/page.tsx` - Add comment/reaction triggers

---

## Checklist for Full Implementation

- [ ] Phase 1.1: Database table created
- [ ] Phase 1.2: Packages installed
- [ ] Phase 1.3: API endpoint updated with JWT signing
- [ ] Phase 2.1: Appointment trigger added
- [ ] Phase 2.2: Moments comment trigger added
- [ ] Phase 2.3: Moments reaction trigger added
- [ ] Phase 3.1: Device token registration verified
- [ ] Phase 3.2: Appointment notification tested
- [ ] Phase 3.3: Moments notification tested
- [ ] Android app built and tested
- [ ] iOS app built and tested
- [ ] Web push tested in browser

---

## Environment Variables Needed

```bash
# Already set
FIREBASE_SERVER_KEY=<your_firebase_json>

# Still needed for Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your_vapid_public_key>
VAPID_PRIVATE_KEY=<your_vapid_private_key>
```

---

## Estimated Time to Complete

- Phase 1: 15 minutes
- Phase 2: 20 minutes
- Phase 3: 30 minutes
- **Total: ~65 minutes**

---

## Support & Debugging

### Check Device Token Registration
```sql
SELECT user_id, platform, COUNT(*) as count
FROM device_tokens
WHERE is_active = true
GROUP BY user_id, platform;
```

### Check Notification Logs
```sql
SELECT * FROM notifications
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Browser Console Logs
```javascript
// Should see:
// "Push notification token received: ..."
// "Push notification received: ..."
// "Push notification action performed: ..."
```

---

## Next Steps

1. **Immediately**: Run database migration
2. **Next**: Install packages
3. **Then**: Update API endpoint
4. **Finally**: Add triggers to appointment and moments pages

**Start with Phase 1 - it's blocking everything else!**

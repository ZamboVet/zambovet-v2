# Push Notifications Quick Start

## 1. Install Package (5 min)

```bash
npm install @capacitor/push-notifications
npx cap sync
```

## 2. Database Setup (5 min)

Run the migration in Supabase SQL Editor:

```sql
-- Copy contents from migrations/add_device_tokens.sql
-- Paste and execute in Supabase dashboard
```

Or use Supabase CLI:
```bash
supabase migration up
```

## 3. Firebase Setup (15 min)

### Get Firebase Server Key
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Settings → Service Accounts → Generate new private key
4. Copy the entire JSON content

### Add to Environment
Create/update `.env.local`:
```bash
FIREBASE_SERVER_KEY=<paste_entire_json_here>
```

### Android App
```bash
# Download google-services.json from Firebase
# Place in: android/app/google-services.json
npx cap sync android
```

## 4. Test Push Notification (5 min)

### Send Test Notification
```bash
curl -X POST http://localhost:3000/api/send-push-notification \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "title": "Test Notification",
    "message": "This is a test push notification"
  }'
```

### Check Device Tokens
```bash
# In Supabase dashboard, run:
SELECT * FROM device_tokens WHERE is_active = true;
```

## 5. Integrate with Appointments (10 min)

In `app/veterinarian/appointments/page.tsx`, after updating appointment status:

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
      await fetch('/api/send-push-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: ownerUserId,
          title: next === 'confirmed' ? '✨ Appointment Confirmed!' : `Appointment ${next}`,
          message: `Your appointment #${id} → ${next}`,
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

## 6. Integrate with Moments (10 min)

In `app/pet_owner/moments/page.tsx`, in the `addComment` function:

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
          title: 'New comment on your post',
          message: `${(owner as any)?.full_name || 'Someone'} commented: "${text.substring(0, 50)}..."`,
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

And in `toggleLike`:

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

## 7. Test on Device (10 min)

### Android
```bash
npx cap run android
# App will open in Android Studio emulator
# Trigger an appointment status change
# Check notification in system tray
```

### iOS
```bash
npx cap run ios
# App will open in Xcode simulator
# Trigger an appointment status change
# Check notification
```

### Web
```bash
npm run dev
# Open http://localhost:3000
# Check browser console for token registration
# Send test notification via curl
```

## Verification Checklist

- [ ] Package installed: `npm list @capacitor/push-notifications`
- [ ] Database table exists: `SELECT * FROM device_tokens LIMIT 1;`
- [ ] Environment variable set: `echo $FIREBASE_SERVER_KEY`
- [ ] Device token registered: Check `device_tokens` table after opening app
- [ ] Test notification sent: `curl` command succeeds
- [ ] Notification received: Check device/browser
- [ ] Notification tap works: Opens correct page
- [ ] Integration working: Trigger appointment/moment action, see notification

## Troubleshooting

### Token not registering
```bash
# Check browser console for errors
# Verify user is authenticated
# Check RLS policies: SELECT * FROM device_tokens;
```

### Notification not received
```bash
# Check Firebase console for delivery errors
# Verify FIREBASE_SERVER_KEY is correct
# Check device token is active: SELECT * FROM device_tokens WHERE is_active = true;
```

### Build errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npx cap sync
```

## Next: Web Push (Optional, 20 min)

For browser notifications without Firebase:

```bash
# Generate VAPID keys
npm install -g web-push
web-push generate-vapid-keys

# Add to .env.local
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public_key>
VAPID_PRIVATE_KEY=<private_key>

# Create public/sw.js (see PUSH_NOTIFICATIONS_SETUP.md)
```

## Total Time: ~60 minutes

- Installation: 5 min
- Database: 5 min
- Firebase: 15 min
- Testing: 5 min
- Integration: 20 min
- Device testing: 10 min

## Support

- Full setup guide: `PUSH_NOTIFICATIONS_SETUP.md`
- Implementation details: `PUSH_NOTIFICATIONS_IMPLEMENTATION.md`
- API reference: `lib/services/pushNotificationService.ts`

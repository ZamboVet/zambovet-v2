# Push Notifications Setup Guide

This document outlines the setup required to enable push notifications in the ZamboVet app.

## Overview

The push notification system supports three platforms:
- **Android**: Firebase Cloud Messaging (FCM)
- **iOS**: Apple Push Notification service (APNs)
- **Web**: Web Push API with VAPID keys

## Database Setup

### 1. Run Migration

Execute the migration to create the `device_tokens` table:

```bash
# Using Supabase CLI
supabase migration up

# Or manually run the SQL from migrations/add_device_tokens.sql
```

This creates:
- `device_tokens` table to store device tokens
- RLS policies for user privacy
- Indexes for performance

## Installation

### 1. Install Dependencies

```bash
npm install @capacitor/push-notifications
npm install web-push  # For web push support
```

### 2. Update Capacitor Config

The `capacitor.config.ts` is already configured. Verify it has:

```typescript
const config: CapacitorConfig = {
  appId: 'com.zambovet.app',
  appName: 'ZamboVet',
  webDir: 'public',
  // ... other config
};
```

## Platform-Specific Setup

### Android (Firebase Cloud Messaging)

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project or select existing
   - Add Android app with package name `com.zambovet.app`

2. **Get Server Key**
   - In Firebase Console: Project Settings → Service Accounts
   - Generate new private key (JSON)
   - Extract the `server_key` from the JSON

3. **Set Environment Variables**
   ```bash
   FIREBASE_SERVER_KEY=your_firebase_server_key
   ```

4. **Update Android App**
   ```bash
   # Place google-services.json in android/app/
   npx cap sync android
   ```

### iOS (Apple Push Notification)

1. **Create APNs Certificate**
   - Go to Apple Developer Account
   - Create a new APNs certificate
   - Download and convert to .p8 format

2. **Configure in Capacitor**
   - Update `capacitor.config.ts` with APNs configuration
   - Sync with iOS:
   ```bash
   npx cap sync ios
   ```

### Web Push

1. **Generate VAPID Keys**
   ```bash
   npm install -g web-push
   web-push generate-vapid-keys
   ```

2. **Set Environment Variables**
   ```bash
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
   VAPID_PRIVATE_KEY=your_private_key
   ```

3. **Create Service Worker**
   Create `public/sw.js`:
   ```javascript
   self.addEventListener('push', (event) => {
     const data = event.data.json();
     self.registration.showNotification(data.title, {
       body: data.body,
       icon: '/icon-192x192.png',
       data: data.data,
     });
   });

   self.addEventListener('notificationclick', (event) => {
     event.notification.close();
     // Handle notification click
     if (event.notification.data?.appointmentId) {
       clients.openWindow(`/veterinarian/consultations/${event.notification.data.appointmentId}`);
     }
   });
   ```

## Usage

### Sending Push Notifications

From server-side code (API routes, server actions):

```typescript
import { sendPushNotification } from '@/lib/services/pushNotificationService';

// Send to a user
await fetch('/api/send-push-notification', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-id',
    title: 'Appointment Confirmed',
    message: 'Your appointment has been confirmed',
    data: {
      appointmentId: 123,
      type: 'appointment_confirmed'
    },
    notificationType: 'appointment'
  })
});
```

### Receiving Push Notifications

The `usePushNotifications()` hook automatically:
1. Registers device token on app launch
2. Listens for incoming notifications
3. Handles notification taps
4. Updates token usage

```typescript
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';

export function MyComponent() {
  usePushNotifications();
  // Component code...
}
```

## Integration Points

### Appointments
When appointment status changes, send push notification:

```typescript
// In appointment status update
await fetch('/api/send-push-notification', {
  method: 'POST',
  body: JSON.stringify({
    userId: ownerUserId,
    title: 'Appointment Confirmed',
    message: `Your appointment on ${date} at ${time} has been confirmed`,
    data: { appointmentId: appointmentId },
    notificationType: 'appointment_confirmed'
  })
});
```

### Moments (Posts)
When someone comments or reacts:

```typescript
// In comment/reaction handler
await fetch('/api/send-push-notification', {
  method: 'POST',
  body: JSON.stringify({
    userId: postOwnerUserId,
    title: 'New comment on your post',
    message: `${commenterName} commented: "${comment}"`,
    data: { postId: postId },
    notificationType: 'moment'
  })
});
```

## Testing

### Local Testing

1. **Web**: Use Chrome DevTools → Application → Service Workers
2. **Android**: Use Android Studio emulator with FCM
3. **iOS**: Use Xcode simulator with APNs

### Send Test Notification

```bash
curl -X POST http://localhost:3000/api/send-push-notification \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "title": "Test Notification",
    "message": "This is a test push notification"
  }'
```

## Troubleshooting

### Device Token Not Registering
- Check browser console for errors
- Verify user is authenticated
- Check RLS policies on `device_tokens` table

### Notifications Not Received
- Verify FCM/APNs credentials are correct
- Check Firebase/Apple console for delivery status
- Ensure device token is active in database

### Service Worker Issues
- Clear browser cache and service workers
- Check `public/sw.js` exists and is valid
- Verify VAPID keys are correct

## Security Considerations

1. **RLS Policies**: Device tokens are protected by RLS - users can only access their own
2. **Token Rotation**: Tokens are automatically updated on app launch
3. **Deactivation**: Old tokens are marked inactive but retained for audit
4. **API Security**: Push notification endpoint should validate user permissions

## Monitoring

Monitor push notification delivery:

```sql
-- Check active device tokens
SELECT user_id, platform, COUNT(*) as count
FROM device_tokens
WHERE is_active = true
GROUP BY user_id, platform;

-- Check token usage
SELECT * FROM device_tokens
WHERE last_used_at > NOW() - INTERVAL '7 days'
ORDER BY last_used_at DESC;
```

## Next Steps

1. ✅ Database schema created
2. ✅ Service utilities implemented
3. ⏳ Install dependencies: `npm install @capacitor/push-notifications`
4. ⏳ Configure Firebase/APNs credentials
5. ⏳ Update notification triggers to call push API
6. ⏳ Test on native devices
7. ⏳ Monitor delivery metrics

## References

- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification](https://developer.apple.com/documentation/usernotifications)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

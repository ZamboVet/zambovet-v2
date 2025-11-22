# Push Notifications Debugging Guide

## **Common Issues & Solutions**

### **Issue 1: Token Not Registering** 🔴

**Symptoms:**
- No "Push notification token received" in console
- `device_tokens` table is empty
- Only in-app notifications work

**Debug Steps:**

1. **Check Capacitor Detection**
   ```javascript
   // In browser console on mobile:
   console.log(window.Capacitor);
   // Should NOT be undefined
   ```

2. **Check Permissions**
   ```javascript
   // In browser console:
   const { PushNotifications } = await Capacitor.Plugins.PushNotifications;
   const status = await PushNotifications.checkPermissions();
   console.log(status);
   // Should show: { receive: 'granted' }
   ```

3. **Check if Hook is Running**
   - Look for console logs: `"🔔 Push notification token received:"`
   - If not appearing, hook isn't initializing

4. **Verify Supabase Connection**
   - Check if user is authenticated
   - Check if `device_tokens` table exists
   - Check RLS policies allow inserts

---

### **Issue 2: Token Registered But No Notifications Sent** 🟡

**Symptoms:**
- Token appears in `device_tokens` table
- But no notifications received when triggering events

**Debug Steps:**

1. **Check API Endpoint**
   ```bash
   # Test API manually
   curl -X POST http://localhost:3000/api/send-push-notification \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "your-user-id",
       "title": "Test",
       "message": "Test notification"
     }'
   ```

2. **Check Firebase Credentials**
   ```bash
   # Verify FIREBASE_SERVER_KEY is set
   echo $FIREBASE_SERVER_KEY
   # Should output JSON (not empty)
   ```

3. **Check Device Token Format**
   ```sql
   -- In Supabase SQL Editor
   SELECT token, platform FROM device_tokens LIMIT 1;
   -- Token should be a long string
   -- Platform should be 'android', 'ios', or 'web'
   ```

4. **Check Firebase Console**
   - Go to Firebase Console → Cloud Messaging
   - Check if messages are being sent
   - Check delivery status

---

### **Issue 3: Notifications Sent But Not Received** 🟠

**Symptoms:**
- API returns success
- Firebase shows message sent
- But device doesn't receive notification

**Debug Steps:**

1. **Check Device Token is Active**
   ```sql
   SELECT * FROM device_tokens 
   WHERE is_active = true AND platform = 'android';
   ```

2. **Check Google Play Services**
   - On Android device: Settings → Apps → Google Play Services
   - Should be installed and up to date
   - If not, install from Play Store

3. **Check Notification Permissions**
   - Android: Settings → Apps → ZamboVet → Permissions → Notifications
   - Should be enabled

4. **Check Firebase Configuration**
   - Verify `google-services.json` is correct
   - Package name must match: `com.zambovet.app`
   - Rebuild APK after changes

5. **Check Logcat**
   ```bash
   adb logcat | grep -i firebase
   adb logcat | grep -i notification
   adb logcat | grep -i capacitor
   ```

---

## **Step-by-Step Testing**

### **Test 1: Verify Token Registration**

1. Open app on mobile
2. Check browser console (Chrome DevTools via USB)
3. Should see: `"🔔 Push notification token received: ..."`
4. Go to Supabase → `device_tokens` table
5. Should see new row with your token

**If not working:**
- Check if user is logged in
- Check if hook is being called (look for any console logs)
- Check browser console for errors

---

### **Test 2: Verify API Endpoint**

1. Get a device token from `device_tokens` table
2. Run this curl command:
   ```bash
   curl -X POST http://localhost:3000/api/send-push-notification \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "your-user-id-here",
       "title": "Test Notification",
       "message": "This is a test"
     }'
   ```
3. Should return: `{ "success": true, "sent": 1 }`
4. Check Firebase Console for delivery status

**If not working:**
- Check if `FIREBASE_SERVER_KEY` is set
- Check if credentials are valid JSON
- Check API logs for errors

---

### **Test 3: Verify Mobile Receives Notification**

1. Ensure token is registered (Test 1)
2. Ensure API works (Test 2)
3. Change an appointment status (or trigger an event)
4. Check Android notification tray
5. Should see notification appear

**If not working:**
- Check if app is in foreground or background
- Check if notifications are enabled in app settings
- Check if Google Play Services is installed
- Check logcat for errors

---

## **Common Error Messages**

### **"Firebase credentials not configured"**
```
Fix: Set FIREBASE_SERVER_KEY in .env.local
```

### **"Failed to get Firebase access token"**
```
Fix: Verify FIREBASE_SERVER_KEY is valid JSON
```

### **"Cannot find module '@capacitor/push-notifications'"**
```
Fix: Run: npm install @capacitor/push-notifications
     npx cap sync
```

### **"Notification permission denied"**
```
Fix: Go to Android Settings → Apps → ZamboVet → Permissions → Notifications
     Enable notifications
```

---

## **Verification Checklist**

- [ ] `google-services.json` exists in `android/app/`
- [ ] `FIREBASE_SERVER_KEY` set in `.env.local`
- [ ] `device_tokens` table created in Supabase
- [ ] `@capacitor/push-notifications` installed
- [ ] APK rebuilt after changes
- [ ] App opened on mobile (to register token)
- [ ] Token appears in `device_tokens` table
- [ ] Notification permission granted on device
- [ ] Google Play Services installed on device
- [ ] API endpoint returns success
- [ ] Firebase Console shows message sent
- [ ] Device receives notification

---

## **Quick Fixes**

### **Fix 1: Rebuild APK**
```bash
npx cap sync android
npx cap open android
# In Android Studio: Build → Build APK(s)
```

### **Fix 2: Clear App Data**
```bash
adb shell pm clear com.zambovet.app
# Then reinstall APK
```

### **Fix 3: Check Logs**
```bash
adb logcat -c  # Clear logs
# Trigger action
adb logcat | grep -i "firebase\|notification\|capacitor"
```

### **Fix 4: Verify Credentials**
```bash
# Check if FIREBASE_SERVER_KEY is set
cat .env.local | grep FIREBASE_SERVER_KEY

# Should output the full JSON, not empty
```

---

## **If Still Not Working**

1. **Check browser console on mobile** (Chrome DevTools)
   - Connect phone via USB
   - Open Chrome → chrome://inspect
   - Look for any error messages

2. **Check Android logcat**
   ```bash
   adb logcat | grep -E "firebase|notification|capacitor|zambovet"
   ```

3. **Check Firebase Console**
   - Cloud Messaging tab
   - Check if messages are being sent
   - Check delivery status

4. **Verify Supabase**
   ```sql
   -- Check if tokens are being saved
   SELECT COUNT(*) FROM device_tokens;
   
   -- Check if notifications table has records
   SELECT COUNT(*) FROM notifications;
   ```

5. **Test with simple curl**
   ```bash
   curl -X POST http://localhost:3000/api/send-push-notification \
     -H "Content-Type: application/json" \
     -d '{"userId":"test","title":"Test","message":"Test"}'
   ```

---

## **Next Steps**

1. Rebuild APK: `npx cap sync android && npx cap open android`
2. Install on device
3. Open app and check console for token registration
4. Run verification checklist
5. Test each step above
6. Check logs if any step fails

**Most common issue:** Token not registering because hook isn't running or user isn't authenticated.

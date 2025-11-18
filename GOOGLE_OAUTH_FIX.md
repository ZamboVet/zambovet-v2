# Google OAuth Production Redirect Fix

## 🔴 CRITICAL ISSUE

Google is redirecting to `http://localhost:3000/#access_token=...` instead of your production domain. This means **Google's OAuth configuration is missing the production redirect URI**.

## Root Cause

Google OAuth is configured with only the **localhost redirect URI**, not the production URI.

## Solution: Update Google Cloud Console

### Step 1: Go to Google Cloud Console
1. Go to https://console.cloud.google.com/
2. Select your project (ZamboVet or similar)
3. Go to **APIs & Services** → **Credentials**

### Step 2: Find Your OAuth 2.0 Client ID
- Look for "OAuth 2.0 Client IDs"
- Find the one labeled "Web application" or similar
- Click on it to edit

### Step 3: Add Production Redirect URI
In the **Authorized redirect URIs** section, add:
```
https://zambovet-v2.vercel.app/auth/v1/callback
```

**Complete list should include:**
```
http://localhost:3000/auth/v1/callback
https://zambovet-v2.vercel.app/auth/v1/callback
```

### Step 4: Save Changes
- Click **Save** button
- Wait 5-10 minutes for changes to propagate

### Step 5: Verify in Supabase
Go to your Supabase Dashboard:
1. **Authentication** → **Providers** → **Google**
2. Verify the redirect URI shown matches: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
3. This should already be set, but double-check

## Why This Happens

When you click "Sign in with Google":
1. Your app sends user to Google with `redirectTo: https://zambovet-v2.vercel.app/login`
2. Google checks if this URL is in the **Authorized redirect URIs** list
3. If NOT found, Google redirects to a **default/fallback URI** (which is localhost)
4. This is a security feature to prevent OAuth token hijacking

## Test After Fix

1. Wait 5-10 minutes for Google to update
2. Go to `https://zambovet-v2.vercel.app/login`
3. Click "Sign in with Google"
4. After Google login, check the URL
5. Should show: `https://zambovet-v2.vercel.app/login#access_token=...`
6. NOT: `http://localhost:3000/#access_token=...`

## Checklist

- [ ] Opened Google Cloud Console
- [ ] Found OAuth 2.0 Client ID (Web application)
- [ ] Added `https://zambovet-v2.vercel.app/auth/v1/callback` to Authorized redirect URIs
- [ ] Saved changes
- [ ] Waited 5-10 minutes
- [ ] Tested Google login in production
- [ ] Verified redirect URL is correct

## If Still Not Working

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Verify Supabase Google provider is enabled** with correct Client ID and Secret
3. **Check Supabase logs** for OAuth errors
4. **Verify all redirect URIs match exactly** (including protocol and path)

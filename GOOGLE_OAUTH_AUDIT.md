# Google OAuth Sign-In Audit - Complete Checklist

## 🔴 CRITICAL ISSUES TO CHECK IN PRODUCTION

### 1. **Supabase Google OAuth Configuration**
**Status:** ❓ NEEDS VERIFICATION

**What to check in Supabase Dashboard:**
1. Go to **Authentication** → **Providers** → **Google**
2. Verify these settings:
   - ✅ Google provider is **ENABLED**
   - ✅ Client ID is set (from Google Cloud Console)
   - ✅ Client Secret is set (from Google Cloud Console)
   - ✅ Authorized redirect URIs includes:
     - `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
     - `https://zambovet-v2.vercel.app/auth/v1/callback`
     - `http://localhost:3000/auth/v1/callback` (for development)

**Action Required:**
```
If ANY of these are missing or incorrect, Google OAuth will NOT work
```

---

### 2. **Google Cloud Console Configuration**
**Status:** ❓ NEEDS VERIFICATION

**What to check in Google Cloud Console:**
1. Go to **APIs & Services** → **Credentials**
2. Find your OAuth 2.0 Client ID (Web application)
3. Verify **Authorized redirect URIs** includes:
   - `https://pfigsln ozindfcgsofvl.supabase.co/auth/v1/callback`
   - `https://zambovet-v2.vercel.app/auth/v1/callback`
   - `http://localhost:3000/auth/v1/callback`

**Action Required:**
```
If redirect URIs don't match Supabase settings, OAuth will fail
```

---

### 3. **Code Implementation Audit**

#### ✅ Signup Page (`/app/signup/page.tsx`)
- **Line 519:** `redirectTo: ${window.location.origin}/signup?mode=google`
  - ✅ Uses dynamic `window.location.origin` (correct for both dev and prod)
  - ✅ Includes `?mode=google` query parameter
  
- **Lines 45-99:** OAuth redirect handler
  - ✅ Checks for `mode === 'google'` in query params
  - ✅ Parses hash params for OAuth tokens
  - ✅ Waits 500ms for Supabase to process tokens
  - ✅ Gets authenticated user via `supabase.auth.getUser()`
  - ✅ Auto-fills email and sets role to `pet_owner`
  - ✅ Moves to step 2

#### ✅ Login Page (`/app/login/page.tsx`)
- **Line 300:** `redirectTo: ${window.location.origin}/login`
  - ✅ Uses dynamic `window.location.origin` (correct for both dev and prod)
  - ✅ No query parameter (not needed for login)

#### ✅ Supabase Client (`/lib/supabaseClient.ts`)
- ✅ Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ Has `persistSession: true` and `autoRefreshToken: true`

---

## 🔍 PRODUCTION TROUBLESHOOTING STEPS

### Step 1: Verify Environment Variables
```bash
# In Vercel Dashboard, check these are set:
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Step 2: Test OAuth Flow
1. Go to `https://zambovet-v2.vercel.app/signup`
2. Click "Sign up with Google"
3. Complete Google login
4. **Expected:** Redirected to `https://zambovet-v2.vercel.app/signup?mode=google#access_token=...`
5. **Expected:** Email auto-filled, moved to step 2

### Step 3: Check Browser Console
Open DevTools (F12) and look for:
- ❌ **Error:** "Missing configuration" → Environment variables not set
- ❌ **Error:** "OAuth error" → Supabase/Google config mismatch
- ❌ **Error:** "Google signup redirect error" → Issue in redirect handler
- ✅ **Success:** No errors, email auto-filled

### Step 4: Check Supabase Logs
1. Go to Supabase Dashboard
2. **Authentication** → **Logs**
3. Look for OAuth events
4. Check for error messages

---

## 📋 COMMON ISSUES & SOLUTIONS

### Issue: "Redirect URI mismatch"
**Cause:** Redirect URI in Google Console doesn't match Supabase
**Solution:**
1. Copy exact URI from Supabase: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
2. Add to Google Cloud Console Authorized redirect URIs
3. Wait 5-10 minutes for changes to propagate

### Issue: "OAuth provider not enabled"
**Cause:** Google provider disabled in Supabase
**Solution:**
1. Go to Supabase → Authentication → Providers
2. Click Google provider
3. Toggle **Enable Sign-in with Google** ON
4. Enter Client ID and Client Secret

### Issue: "User already exists" error
**Cause:** Email already registered
**Solution:** This is working as intended - user should sign in instead

### Issue: "Page stuck on loading"
**Cause:** Redirect handler not detecting OAuth tokens
**Solution:**
1. Check browser console for errors
2. Verify `window.location.hash` contains `access_token`
3. Check if `mode=google` is in query params

---

## ✅ VERIFICATION CHECKLIST

Before considering Google OAuth "working":

- [ ] Supabase Google provider is ENABLED
- [ ] Google OAuth Client ID is set in Supabase
- [ ] Google OAuth Client Secret is set in Supabase
- [ ] Redirect URI in Supabase matches Google Cloud Console
- [ ] Environment variables set in Vercel
- [ ] Can click "Sign up with Google" without errors
- [ ] Redirected to Google login page
- [ ] After Google login, redirected back with access_token in URL
- [ ] Email auto-filled on signup page
- [ ] Moved to step 2 (Profile)
- [ ] Can complete signup flow
- [ ] Account created successfully

---

## 🚀 NEXT STEPS

1. **Verify Supabase Configuration** (CRITICAL)
   - Check Google provider is enabled
   - Verify Client ID and Secret
   - Confirm redirect URIs

2. **Verify Google Cloud Configuration** (CRITICAL)
   - Check redirect URIs match Supabase
   - Verify OAuth consent screen is configured

3. **Check Environment Variables** (CRITICAL)
   - Verify in Vercel Dashboard
   - Redeploy if changed

4. **Test in Production**
   - Go to `https://zambovet-v2.vercel.app/signup`
   - Click "Sign up with Google"
   - Check browser console for errors

5. **Check Supabase Logs**
   - Look for OAuth errors
   - Check authentication logs

---

## 📞 SUPPORT

If still not working after all checks:
1. Check Supabase documentation: https://supabase.com/docs/guides/auth/social-login/auth-google
2. Check browser console for specific error messages
3. Check Supabase logs for OAuth events
4. Verify all redirect URIs are exact matches (including protocol and trailing slashes)

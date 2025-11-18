# Vercel Environment Variables Setup

## 🔴 CRITICAL: Set NEXT_PUBLIC_SITE_URL in Vercel

The Google OAuth redirect is still going to `localhost:3000` because the environment variable is not set in production.

### Steps to Fix:

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard

2. **Select Your Project**
   - Click on `zambovet-v2` project

3. **Go to Settings**
   - Click **Settings** tab at the top

4. **Navigate to Environment Variables**
   - Click **Environment Variables** in the left sidebar

5. **Add New Environment Variable**
   - **Name:** `NEXT_PUBLIC_SITE_URL`
   - **Value:** `https://zambovet-v2.vercel.app`
   - **Environments:** Select all (Production, Preview, Development)
   - Click **Save**

6. **Redeploy Your Application**
   - Go to **Deployments** tab
   - Click the three dots (...) on the latest deployment
   - Click **Redeploy**
   - Wait for deployment to complete

### Verify It's Working:

After redeployment:
1. Go to `https://zambovet-v2.vercel.app/login`
2. Click "Sign in with Google"
3. Check the redirect URL in browser address bar
4. Should be: `https://zambovet-v2.vercel.app/login#access_token=...`
5. NOT: `http://localhost:3000/#access_token=...`

### Why This Matters:

- **Development:** Uses `window.location.origin` = `http://localhost:3000`
- **Production:** Uses `NEXT_PUBLIC_SITE_URL` = `https://zambovet-v2.vercel.app`
- Without the env var, production falls back to `window.location.origin` which is wrong

### Current Code:

```typescript
// Login page
const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/login`;

// Signup page
redirectTo: `${window.location.origin}/signup?mode=google`
```

The login page will use the env var once it's set. The signup page uses `window.location.origin` directly (which is correct for signup since it has the `?mode=google` query param).

---

## ✅ Checklist

- [ ] Added `NEXT_PUBLIC_SITE_URL=https://zambovet-v2.vercel.app` to Vercel
- [ ] Selected all environments (Production, Preview, Development)
- [ ] Redeployed the application
- [ ] Tested Google login redirect in production
- [ ] Verified redirect URL is `https://zambovet-v2.vercel.app` (not localhost)

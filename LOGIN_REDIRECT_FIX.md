# Login Redirect Issue - Troubleshooting Guide

## Problem
After successful login on `hrms.infinititechpartners.com`, the page shows "Login successful" but doesn't redirect to the dashboard.

## Root Causes

### 1. Cookie Not Being Set Properly
The session cookie might not be saved due to incorrect cookie settings in production.

**Fix Applied:**
- Added `sameSite: 'lax'` to cookie configuration in `src/lib/auth.ts`

### 2. Environment Variables Not Set in Vercel
The production environment needs proper configuration.

## Immediate Fixes to Apply on Vercel

### Step 1: Set Environment Variables in Vercel Dashboard

Go to your Vercel project → Settings → Environment Variables and add:

```bash
# Required Variables
JWT_SECRET="your-super-secret-jwt-key-production-xyz123abc456"
DATABASE_URL="postgresql://neondb_owner:npg_0axlOWdPmtT8@ep-falling-math-a82t3qs3-pooler.eastus2.azure.neon.tech/neondb?sslmode=require&channel_binding=require"
NODE_ENV="production"

# Optional but Recommended
NEXT_PUBLIC_APP_URL="https://hrms.infinititechpartners.com"
NEXT_PUBLIC_API_URL="https://hrms.infinititechpartners.com/api"
```

### Step 2: Redeploy After Setting Environment Variables

After adding the variables, trigger a new deployment:
1. Go to Deployments tab
2. Click on the latest deployment
3. Click "Redeploy" button

## Testing Checklist

After redeploying, test the following:

### 1. Check Browser Console
Open DevTools (F12) and check:
- Any errors in Console tab?
- Network tab → Look for the `/api/auth/login` request
  - Status should be 200
  - Response should contain `{ role, name, email }`

### 2. Check Cookies
In DevTools → Application tab → Cookies:
- Look for cookie named `session`
- It should have:
  - `Domain`: `.infinititechpartners.com` or `hrms.infinititechpartners.com`
  - `Path`: `/`
  - `HttpOnly`: ✓
  - `Secure`: ✓
  - `SameSite`: `Lax`

### 3. Manual Cookie Check
If cookies aren't being set, try this in the browser console after "successful login":
```javascript
document.cookie
```

If the `session` cookie is missing, the issue is with cookie configuration.

## Additional Debugging Steps

### Check Vercel Logs
1. Go to Vercel Dashboard → Your Project → Logs
2. Look for errors during login attempt
3. Check if JWT_SECRET is being loaded

### Test API Endpoint Directly
```bash
curl -X POST https://hrms.infinititechpartners.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin","password":"12345678"}' \
  -v
```

Look for `Set-Cookie` header in the response.

## Common Issues & Solutions

### Issue 1: Cookie Domain Mismatch
**Symptom**: Cookie shows in DevTools but doesn't persist after redirect

**Solution**: The cookie domain needs to match your domain. Since you're using a subdomain, ensure:
- Cookie is set without explicit domain (will default to current domain)
- OR set domain as `.infinititechpartners.com` (with leading dot)

### Issue 2: HTTPS/Secure Flag
**Symptom**: Cookie not being set on production

**Solution**: In production, cookies must have `secure: true`. This is already set based on `NODE_ENV`.

### Issue 3: SameSite Restrictions
**Symptom**: Cookie set but not sent with navigation requests

**Solution**: Already fixed by adding `sameSite: 'lax'` in auth.ts

### Issue 4: JWT_SECRET Not Set
**Symptom**: Login API returns 500 error

**Solution**: Set JWT_SECRET in Vercel environment variables (see Step 1 above)

## Quick Test After Fix

1. Clear all cookies for `hrms.infinititechpartners.com`
2. Go to login page
3. Open DevTools → Network tab
4. Login with: `admin` / `12345678`
5. Check:
   - `/api/auth/login` returns 200
   - Response has `Set-Cookie` header
   - Page redirects to `/admin/dashboard`

## If Still Not Working

### Option A: Check Client-Side Redirect
The redirect happens in JavaScript. If JS is blocked or fails:

Check `src/app/(auth)/login/page.tsx` line 59-62:
```typescript
setTimeout(() => {
  router.push(redirectUrl);
  router.refresh();
}, 800);
```

### Option B: Force Hard Redirect
If soft redirect fails, we can use hard redirect:

```typescript
// Instead of router.push()
window.location.href = redirectUrl;
```

## Contact Points

If none of these work, please provide:
1. Screenshot of Browser DevTools → Network tab (showing /api/auth/login request)
2. Screenshot of Browser DevTools → Application → Cookies
3. Screenshot of Vercel → Logs (during login attempt)
4. Any error messages from browser console

## Files Modified
- `src/lib/auth.ts` - Added `sameSite: 'lax'` to cookie configuration

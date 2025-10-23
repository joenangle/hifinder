# OAuth Setup Guide for HiFinder

## Problem Diagnosed (Oct 2024)

**Issue:** "Try signing in with another account" error on staging
**Root Cause:** Explicit `redirect_uri` in auth.ts conflicting with NextAuth's automatic handling
**Fix:** Removed manual redirect_uri, let NextAuth handle it automatically

---

## Required Configuration

### 1. Vercel Environment Variables

Each environment (Production, Preview/Staging, Development) needs:

```bash
# NextAuth Configuration
NEXTAUTH_URL=https://staging.hifinder.app  # Change per environment
NEXTAUTH_SECRET=<your-secret-here>

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-key>
```

### 2. Google Cloud Console Configuration

**Navigate to:** [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

**Project:** HiFinder (or your project name)

**OAuth 2.0 Client ID Configuration:**

**Authorized JavaScript origins:**
- `http://localhost:3000` (development)
- `http://localhost:3001` (development alt)
- `http://localhost:3002` (development alt)
- `https://hifinder.app` (production)
- `https://www.hifinder.app` (production www)
- `https://staging.hifinder.app` (staging)
- `https://*.vercel.app` (Vercel previews - if allowed)

**Authorized redirect URIs:**
- `http://localhost:3000/api/auth/callback/google`
- `http://localhost:3001/api/auth/callback/google`
- `http://localhost:3002/api/auth/callback/google`
- `https://hifinder.app/api/auth/callback/google`
- `https://www.hifinder.app/api/auth/callback/google`
- `https://staging.hifinder.app/api/auth/callback/google`

**Note:** Vercel preview URLs (`*.vercel.app`) require wildcard support or individual URL registration.

---

## Vercel-Specific Setup

### Setting Environment Variables in Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. Add each variable with appropriate scope:
   - **Production:** Production deployments only
   - **Preview:** All preview/staging deployments
   - **Development:** Local development (optional)

3. **IMPORTANT for staging:**
   ```
   Variable: NEXTAUTH_URL
   Value: https://staging.hifinder.app
   Environment: Preview (or specific to staging branch)
   ```

### Vercel Preview Branch Configuration

If using Vercel's automatic preview deployments:

**Option 1: Use VERCEL_URL (automatic)**
- `getBaseUrl()` function in auth.ts will automatically use `VERCEL_URL`
- Ensure Google OAuth has wildcard or specific preview URLs registered

**Option 2: Set NEXTAUTH_URL per branch**
- Create branch-specific environment variables in Vercel
- Example: `staging` branch → `NEXTAUTH_URL=https://staging.hifinder.app`

---

## Testing OAuth Configuration

### Local Testing
```bash
npm run dev
# Visit http://localhost:3002 (or your configured port)
# Click "Sign in with Google"
# Should redirect to Google OAuth consent screen
# Should redirect back to /api/auth/callback/google
# Should successfully authenticate
```

### Staging Testing
```bash
# Visit https://staging.hifinder.app
# Click "Sign in with Google"
# Check browser network tab for redirect URLs
# Verify redirect matches Google Cloud Console configuration
```

### Common Errors

**"Try signing in with another account"**
- **Cause:** redirect_uri mismatch
- **Fix:** Ensure NEXTAUTH_URL matches environment, remove explicit redirect_uri from code

**"redirect_uri_mismatch"**
- **Cause:** Google OAuth redirect URI not registered
- **Fix:** Add the redirect URI to Google Cloud Console

**"invalid_client"**
- **Cause:** Wrong GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET
- **Fix:** Verify environment variables match Google Cloud Console credentials

**"Error: NEXTAUTH_URL not set"**
- **Cause:** Missing NEXTAUTH_URL environment variable
- **Fix:** Add to Vercel environment variables

---

## Security Best Practices

1. **Never commit credentials:**
   - Use `.env.local` for development
   - Use Vercel environment variables for deployments
   - Add `.env.local` to `.gitignore`

2. **Use different OAuth clients per environment:**
   - Recommended: Separate Google OAuth clients for dev/staging/production
   - Prevents credential leakage across environments

3. **Rotate secrets regularly:**
   - NEXTAUTH_SECRET should be unique per environment
   - Generate with: `openssl rand -base64 32`

4. **Monitor OAuth logs:**
   - Check Google Cloud Console → OAuth consent screen → User activity
   - Monitor failed sign-in attempts

---

## Vercel Environment Variable Checklist

### Production
- [ ] NEXTAUTH_URL=https://hifinder.app
- [ ] NEXTAUTH_SECRET=<unique-secret>
- [ ] GOOGLE_CLIENT_ID
- [ ] GOOGLE_CLIENT_SECRET
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] SUPABASE_SERVICE_ROLE_KEY

### Staging (Preview branch: staging)
- [ ] NEXTAUTH_URL=https://staging.hifinder.app
- [ ] NEXTAUTH_SECRET=<unique-secret>
- [ ] GOOGLE_CLIENT_ID (can reuse or separate)
- [ ] GOOGLE_CLIENT_SECRET (can reuse or separate)
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] SUPABASE_SERVICE_ROLE_KEY

### Development
- [ ] NEXTAUTH_URL=http://localhost:3002 (in .env.local)
- [ ] NEXTAUTH_SECRET=development-secret-change-in-production
- [ ] GOOGLE_CLIENT_ID
- [ ] GOOGLE_CLIENT_SECRET
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] SUPABASE_SERVICE_ROLE_KEY

---

## Code Changes Made (Oct 2024)

**File:** `src/lib/auth.ts`

**Before (BROKEN):**
```typescript
authorization: {
  params: {
    prompt: "consent",
    access_type: "offline",
    response_type: "code",
    redirect_uri: `${getBaseUrl()}/api/auth/callback/google` // ❌ WRONG
  }
}
```

**After (FIXED):**
```typescript
authorization: {
  params: {
    prompt: "consent",
    access_type: "offline",
    response_type: "code"
    // ✅ Let NextAuth handle redirect_uri automatically
  }
}
```

**Why this matters:**
- NextAuth automatically constructs the correct redirect URI based on NEXTAUTH_URL
- Manual redirect_uri can cause mismatches when environment changes
- Google OAuth requires exact redirect URI match

---

## Quick Fixes

### If OAuth suddenly stops working:

1. **Check Vercel environment variables:**
   ```bash
   vercel env ls
   ```

2. **Verify NEXTAUTH_URL matches deployment URL:**
   - Production: `https://hifinder.app`
   - Staging: `https://staging.hifinder.app`
   - NOT: `https://hifinder-xyz123.vercel.app` (unless registered in Google)

3. **Check Google Cloud Console redirect URIs:**
   - Must exactly match `<NEXTAUTH_URL>/api/auth/callback/google`
   - Case-sensitive, trailing slashes matter

4. **Redeploy after environment variable changes:**
   ```bash
   vercel --prod  # for production
   # or push to staging branch for automatic deploy
   ```

---

## Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/configuration/options)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

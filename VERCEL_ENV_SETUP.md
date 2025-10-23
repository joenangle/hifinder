# Vercel Environment Variables Setup Guide

## Problem: Different URLs for Different Environments

**Production:** `https://hifinder.app`
**Staging:** `https://staging.hifinder.app`
**Both need working OAuth without breaking each other!**

---

## Solution: Environment-Specific Variables in Vercel

Vercel allows you to set **the same variable with different values** for different environments.

### Step-by-Step Setup

#### 1. Go to Vercel Dashboard
- Navigate to: https://vercel.com/dashboard
- Select your project: **hifinder**
- Click: **Settings** → **Environment Variables**

#### 2. Add NEXTAUTH_URL for Production

Click "Add New":
```
Key: NEXTAUTH_URL
Value: https://hifinder.app
Environment:
  ✅ Production
  ⬜ Preview
  ⬜ Development
```

Click **Save**

#### 3. Add NEXTAUTH_URL for Staging

Click "Add New" again:
```
Key: NEXTAUTH_URL
Value: https://staging.hifinder.app
Environment:
  ⬜ Production
  ✅ Preview
  ⬜ Development
```

Click **Save**

#### 4. (Optional) Add NEXTAUTH_URL for Local Development

Click "Add New" again:
```
Key: NEXTAUTH_URL
Value: http://localhost:3002
Environment:
  ⬜ Production
  ⬜ Preview
  ✅ Development
```

Click **Save**

---

## Visual: What You Should See in Vercel

After setup, your Environment Variables section should look like:

```
NEXTAUTH_URL
├─ Production:  https://hifinder.app
├─ Preview:     https://staging.hifinder.app
└─ Development: http://localhost:3002

NEXTAUTH_SECRET
├─ Production:  <your-prod-secret>
├─ Preview:     <your-staging-secret>
└─ Development: development-secret-change-in-production

GOOGLE_CLIENT_ID
├─ Production:  <same-for-all>
├─ Preview:     <same-for-all>
└─ Development: <same-for-all>

GOOGLE_CLIENT_SECRET
├─ Production:  <same-for-all>
├─ Preview:     <same-for-all>
└─ Development: <same-for-all>

... (other variables follow same pattern)
```

---

## Alternative: Branch-Specific Configuration

If you want even more control, you can target specific branches:

### For Main Branch (Production)
```
Key: NEXTAUTH_URL
Value: https://hifinder.app
Git Branch: main
```

### For Staging Branch
```
Key: NEXTAUTH_URL
Value: https://staging.hifinder.app
Git Branch: staging
```

This is useful if you have multiple preview branches with different configurations.

---

## How Vercel Resolves Environment Variables

When deploying, Vercel checks in this order:

1. **Branch-specific** (if configured for that exact branch)
2. **Environment-specific** (Production/Preview/Development)
3. **Global** (if no environment specified - NOT RECOMMENDED)

**Example:** When you deploy to `staging` branch:
- Vercel sees it's a "Preview" deployment
- Loads `NEXTAUTH_URL` value set for "Preview" environment
- Uses `https://staging.hifinder.app`

When you deploy to `main` branch:
- Vercel sees it's a "Production" deployment
- Loads `NEXTAUTH_URL` value set for "Production" environment
- Uses `https://hifinder.app`

---

## Current Environment Variables Checklist

### Required for All Environments

Mark which environments need each variable:

**NEXTAUTH_URL**
- [x] Production: `https://hifinder.app`
- [x] Preview: `https://staging.hifinder.app`
- [ ] Development: `http://localhost:3002` (optional)

**NEXTAUTH_SECRET**
- [x] Production: (unique secret)
- [x] Preview: (unique secret)
- [ ] Development: `development-secret-change-in-production`

**GOOGLE_CLIENT_ID**
- [x] Production
- [x] Preview (same value)
- [x] Development (same value)

**GOOGLE_CLIENT_SECRET**
- [x] Production
- [x] Preview (same value)
- [x] Development (same value)

**NEXT_PUBLIC_SUPABASE_URL**
- [x] Production
- [x] Preview (same value)
- [x] Development (same value)

**SUPABASE_SERVICE_ROLE_KEY**
- [x] Production
- [x] Preview (same value)
- [x] Development (same value)

---

## Verifying Configuration

### Check Current Values (via Vercel CLI)

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Login
vercel login

# List all environment variables
vercel env ls

# Pull environment variables for specific environment
vercel env pull .env.production --environment production
vercel env pull .env.preview --environment preview
```

### Verify After Deployment

**For Staging:**
```bash
# After pushing to staging branch
curl -I https://staging.hifinder.app/api/auth/signin

# Should show 200 OK, not redirect errors
```

**For Production:**
```bash
# After deploying to production
curl -I https://hifinder.app/api/auth/signin

# Should show 200 OK, not redirect errors
```

---

## Common Mistakes to Avoid

### ❌ WRONG: Setting one value for all environments
```
NEXTAUTH_URL = https://hifinder.app
Environments: Production, Preview, Development (all checked)
```
**Problem:** Staging will use production URL, OAuth breaks

### ✅ CORRECT: Separate values per environment
```
NEXTAUTH_URL = https://hifinder.app
Environment: Production only

NEXTAUTH_URL = https://staging.hifinder.app
Environment: Preview only
```
**Result:** Each environment uses its correct URL

---

## Troubleshooting

### OAuth still broken after setting NEXTAUTH_URL?

1. **Redeploy after changing environment variables:**
   ```bash
   # Trigger new deployment
   git commit --allow-empty -m "Trigger redeploy for env var changes"
   git push origin staging
   ```

2. **Check deployment logs:**
   - Go to Vercel Dashboard → Deployments → Latest staging deployment
   - Check if NEXTAUTH_URL is correctly loaded
   - Look for any OAuth-related errors

3. **Verify Google Cloud Console:**
   - Ensure redirect URI is registered:
     ```
     https://staging.hifinder.app/api/auth/callback/google
     ```

4. **Test locally first:**
   ```bash
   # Set in .env.local
   NEXTAUTH_URL=http://localhost:3002

   # Run dev server
   npm run dev

   # Try OAuth at http://localhost:3002
   ```

---

## Need Help?

**Check environment variables are loaded correctly:**
```typescript
// Add to a test API route
export async function GET() {
  return Response.json({
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV
  })
}
```

Deploy and visit `/api/test-env` to verify values.

---

## Summary: What You Need to Do Right Now

1. Go to Vercel Dashboard → hifinder → Settings → Environment Variables
2. Find existing `NEXTAUTH_URL` (if any) and delete it
3. Add `NEXTAUTH_URL` with value `https://hifinder.app` for **Production only**
4. Add `NEXTAUTH_URL` with value `https://staging.hifinder.app` for **Preview only**
5. Trigger redeploy of staging branch
6. Test OAuth on staging.hifinder.app
7. Verify production still works on hifinder.app

**This will NOT break production** - each environment gets its own value! 🎉

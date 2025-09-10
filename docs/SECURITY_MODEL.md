# Security Model Documentation

## Overview
HiFinder uses a **Service-Role-Only Pattern** for database security, combining NextAuth.js for authentication with Supabase for data storage.

## Architecture

### Authentication Layer (NextAuth.js)
- **Provider**: Google OAuth
- **Session Strategy**: JWT tokens
- **Session Storage**: Client-side cookies
- **User Data**: Synced to `users` table in Supabase

### Database Access Pattern

```
Frontend → API Route → Service Role Client → Supabase
```

#### Key Components:

1. **Frontend** (`/app`, `/components`)
   - No direct database access
   - All data fetched via API routes
   - Uses NextAuth session for user identity

2. **API Routes** (`/app/api/*`)
   - Verify NextAuth session
   - Use service role key for database access
   - Enforce user-specific data filtering

3. **Library Functions** (`/lib/*`)
   - Use `supabaseAdmin` client (service role)
   - Accept `userId` parameter for filtering
   - Handle all database operations

## Security Implementation

### RLS Configuration
All user-specific tables have restrictive RLS policies:

```sql
-- Blocks all anon key access
CREATE POLICY "Block all anon access" ON table_name
  FOR ALL USING (false);
```

This ensures:
- ✅ Service role key bypasses RLS (API routes work)
- ❌ Anon key cannot access user data
- 🔒 All access must go through authenticated API routes

### Protected Tables
- `user_gear` - User's audio equipment
- `user_stacks` - Equipment configurations
- `stack_components` - Stack items
- `wishlists` - User wishlists
- `price_alerts` - Price monitoring
- `alert_history` - Alert logs

### Public Tables
- `components` - Equipment database (read-only)
- `used_listings` - Market listings (read-only)

## API Route Security Pattern

```typescript
// Every API route follows this pattern:
export async function GET() {
  // 1. Verify session
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Use service role to access data
  const data = await getUserData(session.user.id)
  
  // 3. Return filtered data
  return NextResponse.json(data)
}
```

## Environment Variables

### Client-Side (Public)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key (limited by RLS)

### Server-Side (Secret)
- `SUPABASE_SERVICE_ROLE_KEY` - Bypasses RLS, server-only
- `NEXTAUTH_SECRET` - JWT signing secret
- `GOOGLE_CLIENT_ID/SECRET` - OAuth credentials

## Security Benefits

1. **Defense in Depth**: Multiple layers of security
2. **Clear Separation**: Frontend never has privileged access
3. **Audit Trail**: All operations go through API routes
4. **Simple Mental Model**: Easy to reason about security
5. **Framework Agnostic**: Not tied to Supabase Auth

## Migration Path

If you need to migrate to JWT-aware RLS in the future:

1. Pass JWT to Supabase in request headers
2. Create custom JWT claim extraction functions
3. Update RLS policies to use JWT claims
4. Gradually migrate from service role to user-specific tokens

## Testing Security

### Verify RLS is Working
```bash
# This should fail (blocked by RLS)
curl -H "apikey: YOUR_ANON_KEY" \
  https://YOUR_PROJECT.supabase.co/rest/v1/user_gear

# This should succeed (service role bypasses RLS)
curl -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT.supabase.co/rest/v1/user_gear
```

### Verify API Authentication
```bash
# Without session - should return 401
curl http://localhost:3000/api/gear

# With valid session - should return data
curl -H "Cookie: next-auth.session-token=..." \
  http://localhost:3000/api/gear
```

## Maintenance

### Apply RLS Policies
```bash
# Run in Supabase SQL Editor
scripts/implement-secure-rls-policies.sql
```

### Rollback if Needed
```bash
# Run in Supabase SQL Editor
scripts/rollback-rls-policies.sql
```

### Monitor Access
- Check Supabase logs for unauthorized attempts
- Monitor API route errors for auth failures
- Review session expiry handling

## Common Issues & Solutions

### Issue: "Permission denied for table"
**Cause**: RLS blocking anon key access
**Solution**: Ensure all queries go through API routes using service role

### Issue: API returns 401 Unauthorized
**Cause**: Session expired or invalid
**Solution**: Re-authenticate user via NextAuth

### Issue: User can see other users' data
**Cause**: Missing userId filter in query
**Solution**: Always filter by session.user.id in API routes

## Future Enhancements

1. **Rate Limiting**: Add API route rate limits
2. **Request Validation**: Stronger input validation
3. **Audit Logging**: Track all data modifications
4. **Field-Level Security**: Encrypt sensitive fields
5. **2FA Support**: Add two-factor authentication
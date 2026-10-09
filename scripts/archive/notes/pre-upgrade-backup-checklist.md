# Pre-Postgres Upgrade Backup Checklist

## 🔄 Automatic Supabase Backups
- ✅ Supabase automatically creates backups before major upgrades
- ✅ Point-in-time recovery available (up to 7 days on free tier)
- ✅ Can restore from Supabase Dashboard if needed

## 📦 Manual Backup Options (Recommended)

### Option 1: Supabase Dashboard Backup
1. Go to **Supabase Dashboard > Database > Backups**
2. Click **"Create backup"** to create a manual snapshot
3. Wait for completion (usually 1-2 minutes)
4. Verify backup shows in backup list

### Option 2: SQL Dump Backup (Most Comprehensive)
```bash
# Create comprehensive SQL dump
SUPABASE_DB_URL="postgresql://[USER]:[PASSWORD]@[HOST]:5432/postgres"
pg_dump $SUPABASE_DB_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Or with specific tables only
pg_dump $SUPABASE_DB_URL \
  --table=public.user_gear \
  --table=public.user_stacks \
  --table=public.stack_components \
  --table=public.components \
  --table=public.used_listings \
  > critical-tables-backup-$(date +%Y%m%d-%H%M%S).sql
```

### Option 3: Export Critical Data via API
```bash
# Backup user data via our secure APIs
curl -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  "https://dqvuvieggqltkznluvol.supabase.co/rest/v1/user_gear?select=*" \
  > user_gear_backup.json

curl -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  "https://dqvuvieggqltkznluvol.supabase.co/rest/v1/user_stacks?select=*" \
  > user_stacks_backup.json
```

## ⏱️ Recommended Upgrade Timing

### Best Times to Upgrade:
- ✅ **Low traffic hours** (late night/early morning)
- ✅ **When you can monitor** the upgrade process
- ✅ **Not during peak usage** or important demos

### Before Upgrading:
1. ✅ Create manual backup (Dashboard or SQL dump)
2. ✅ Ensure dev server is working locally
3. ✅ Have rollback plan ready
4. ✅ Notify users of brief maintenance window

## 🔧 Upgrade Process
1. **Dashboard:** Settings > Infrastructure > Database
2. **Click:** "Upgrade available" button
3. **Monitor:** Progress in dashboard
4. **Verify:** Application works after upgrade
5. **Test:** Critical user flows (login, gear management)

## 🚨 Rollback Plan
If issues arise:
1. **Immediate:** Contact Supabase support
2. **Restore:** From backup via Dashboard > Database > Backups
3. **Alternative:** Restore from manual SQL dump
4. **Last resort:** Recreate project and import data

## 📊 Risk Assessment
- **Risk Level:** Low-Medium (routine upgrade)
- **Downtime:** 2-5 minutes typically
- **Data Loss Risk:** Very low (automatic backups)
- **Recovery Time:** 5-15 minutes if rollback needed
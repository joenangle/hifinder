# Admin Affiliate Dashboard Setup Guide

Complete setup guide for your admin-only affiliate tracking dashboard.

## 📋 Overview

The admin dashboard lets you track:
- ✅ Affiliate click statistics (eBay, Amazon)
- ✅ Revenue and commission tracking
- ✅ Conversion rates by platform
- ✅ Top performing components
- ✅ Traffic source breakdown
- ✅ Real-time click tracking

## 🚀 Setup Steps

### Step 1: Create Database Tables

Run this SQL in your Supabase SQL Editor:

```bash
# Copy SQL to Supabase Dashboard
cat scripts/create-affiliate-tracking-tables.sql
```

**Important:** Replace `joe@example.com` with your actual admin email in the SQL file.

Or run the setup script:

```bash
node scripts/setup-affiliate-tracking.js
```

### Step 2: Set Environment Variables

Add to `.env.local`:

```bash
# Your admin email (must match Supabase auth user)
ADMIN_EMAIL=your-email@example.com
NEXT_PUBLIC_ADMIN_EMAIL=your-email@example.com

# eBay Campaign ID (get from eBay Partner Network)
NEXT_PUBLIC_EBAY_CAMPAIGN_ID=your_campaign_id_here
```

### Step 3: Create Admin User in Supabase

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Enter your admin email and password
4. Confirm the user (check "Auto Confirm User")

### Step 4: Access the Dashboard

1. **Login:** Navigate to `/admin/login`
2. **Enter credentials:** Use the email/password from Step 3
3. **View dashboard:** You'll be redirected to `/admin/dashboard`

## 📊 Dashboard Features

### Summary Cards
- **Total Clicks:** All affiliate link clicks
- **Total Revenue:** Sum of all commissions
- **Conversion Rate:** Clicks → Purchases
- **Time Range:** Configurable (7/30/90/365 days)

### Platform Performance
- eBay vs Amazon breakdown
- Clicks and revenue per platform
- Visual platform comparison

### Traffic Sources
- Recommendations page clicks
- Component detail page clicks
- Used listings page clicks
- Homepage clicks

### Top Components
- Components ranked by affiliate revenue
- Click count and conversion rate
- Commission earned per component

### Recent Activity
- Last 10 affiliate clicks
- Recent revenue transactions
- Real-time updates

## 🔒 Security

### Access Control
- ✅ Email-based authentication via Supabase Auth
- ✅ Row Level Security (RLS) policies
- ✅ Admin email whitelist check
- ✅ API endpoint authorization

### RLS Policies Applied
```sql
-- Only admin can read clicks
CREATE POLICY "Admin read access for clicks" ON affiliate_clicks
  FOR SELECT USING (auth.jwt() ->> 'email' = 'your-email@example.com');

-- Only admin can manage revenue
CREATE POLICY "Admin full access for revenue" ON affiliate_revenue
  FOR ALL USING (auth.jwt() ->> 'email' = 'your-email@example.com');
```

## 📈 Tracking Revenue

### Manual Entry (Until eBay API Integration)

When you receive commission from eBay/Amazon, add it manually:

```sql
-- Insert revenue record
INSERT INTO affiliate_revenue (
  platform,
  tracking_id,
  sale_amount,
  commission_amount,
  commission_rate,
  status,
  transaction_date
) VALUES (
  'ebay',
  'hf_used_listings_hd600_1234567890',
  299.99,
  23.99,
  8.0,
  'confirmed',
  '2025-10-15T10:30:00Z'
);
```

### Future: Automated Import

You can build CSV import or connect to eBay Partner Network API:

1. Export transactions from eBay Partner Network
2. Upload CSV to dashboard
3. Auto-match tracking IDs to clicks
4. Calculate attribution

## 🛠️ API Endpoints

### Track Click
```typescript
POST /api/analytics/affiliate-click
{
  "platform": "ebay",
  "component_id": "uuid",
  "tracking_id": "hf_recommendations_hd600_123",
  "source": "recommendations",
  "referrer_url": "https://hifinder.app/recommendations"
}
```

### Get Stats (Admin Only)
```typescript
GET /api/admin/affiliate-stats?days=30&platform=ebay
Headers: { Authorization: "Bearer <supabase_token>" }
```

## 📱 Dashboard URLs

- **Login:** `/admin/login`
- **Dashboard:** `/admin/dashboard`
- **Direct link:** `https://hifinder.app/admin/dashboard`

## 🎯 Usage Examples

### Tracking eBay Clicks
Already implemented in `EbayAffiliateCTA.tsx`:

```typescript
const handleClick = async () => {
  const trackingId = generateTrackingId(component.id, source);

  // Track click
  await fetch('/api/analytics/affiliate-click', {
    method: 'POST',
    body: JSON.stringify({
      platform: 'ebay',
      component_id: component.id,
      tracking_id: trackingId,
      source
    })
  });

  // Open affiliate link
  window.open(affiliateLink, '_blank');
};
```

### Adding Amazon Tracking
Update your Amazon affiliate buttons similarly:

```typescript
// In your Amazon button component
await fetch('/api/analytics/affiliate-click', {
  method: 'POST',
  body: JSON.stringify({
    platform: 'amazon',
    component_id: component.id,
    tracking_id: `amz_${source}_${component.id}`,
    source
  })
});
```

## 📊 Viewing Analytics

### Filter Options
- **Time Range:** 7, 30, 90, 365 days
- **Platform:** All, eBay, Amazon
- **Refresh:** Manual refresh button

### Export Data (Future Enhancement)
You can add CSV export:

```typescript
// Download stats as CSV
const exportStats = async () => {
  const response = await fetch('/api/admin/affiliate-stats?days=30&format=csv');
  const csv = await response.text();
  // Trigger download
};
```

## 🔧 Troubleshooting

### Can't Login
- Check email matches `ADMIN_EMAIL` in `.env.local`
- Verify user exists in Supabase Auth
- Ensure user is confirmed (not pending)

### No Data Showing
- Run database setup SQL
- Check RLS policies are applied
- Verify API endpoints return 200 (not 401)

### Clicks Not Tracking
- Check browser console for errors
- Verify `/api/analytics/affiliate-click` returns success
- Check `affiliate_clicks` table in Supabase

### Revenue Not Calculating
- Manually insert test revenue record
- Check `affiliate_revenue` table
- Verify `tracking_id` matches click records

## 📝 Next Steps

1. **Get eBay Campaign ID**
   - Sign up at epn.ebay.com
   - Create campaign
   - Add to `.env.local`

2. **Set Up Database**
   - Run SQL scripts
   - Verify tables exist
   - Create admin user

3. **Test Dashboard**
   - Login at `/admin/login`
   - Click affiliate links on site
   - Check dashboard for tracked clicks

4. **Track First Revenue**
   - Wait for eBay commission
   - Manually add to database
   - View in dashboard

## 🎉 Success Criteria

- ✅ Can login to `/admin/dashboard`
- ✅ See click counts increasing
- ✅ Platform breakdown visible
- ✅ Top components showing
- ✅ Revenue tracking working

---

**Built:** October 2025
**Tech Stack:** Next.js 14, Supabase, TypeScript
**Access:** Admin only (email-based auth)

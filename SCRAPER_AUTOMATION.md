# Reddit Scraper Automation

## Overview
Automated daily scraping of Reddit r/AVexchange for used audio equipment listings.

## How It Works

### GitHub Actions Workflow
- **File**: `.github/workflows/scrape-reddit-listings.yml`
- **Schedule**: Daily at 2 AM UTC (6 PM PST / 9 PM EST)
- **Duration**: ~20-60 minutes (processes 518 components)
- **Manual Trigger**: Available via GitHub Actions UI

### Process
1. **Scrape Reddit**: Search r/AVexchange for all components in database
2. **Save Listings**: Store found listings with real Reddit URLs
3. **Cleanup**: Remove any fake/test listings that slipped through
4. **Report**: Log total listing count

## GitHub Secrets Required

Add these in **GitHub repo → Settings → Secrets → Actions**:

1. `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
2. `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for write access)
3. `REDDIT_CLIENT_ID` - Reddit app client ID
4. `REDDIT_CLIENT_SECRET` - Reddit app secret

### Getting Reddit API Credentials

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Fill in:
   - **Name**: HiFinder Used Listings
   - **Type**: Script
   - **Description**: Automated scraping of r/AVexchange for used audio gear
   - **About URL**: https://hifinder.app
   - **Redirect URI**: http://localhost (not used for script apps)
4. Click "Create app"
5. Copy:
   - **Client ID**: The string under "personal use script"
   - **Client Secret**: The "secret" value

## Manual Execution

### Run locally:
```bash
node scripts/reddit-avexchange-scraper.js
```

### Run via GitHub Actions:
1. Go to **Actions** tab in GitHub
2. Select **Scrape Reddit Used Listings** workflow
3. Click **Run workflow**
4. Select branch (usually `main`)
5. Click **Run workflow**

## Monitoring

### Check Workflow Status:
- GitHub repo → **Actions** tab
- View logs for each run

### Check Listing Count:
```bash
node -e "
require('dotenv').config({path:'.env.local'});
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
supabase.from('used_listings').select('*', {count:'exact', head:true})
  .then(r => console.log('Total listings:', r.count));
"
```

### Check for Fake Listings:
```bash
node scripts/find-fake-listings.js
```

### Delete Fake Listings:
```bash
node scripts/find-fake-listings.js --delete
```

## Troubleshooting

### Scraper Times Out
- Increase `timeout-minutes` in workflow file
- Consider splitting into multiple smaller jobs
- Reddit API rate limiting (2s between requests)

### Duplicate Listings
- Scraper has built-in duplicate detection
- Skips listings already in database (by URL)

### No Listings Found
- Check Reddit API credentials
- Verify r/AVexchange has recent posts
- Check component names match Reddit post titles

### Database Errors
- Verify `SUPABASE_SERVICE_ROLE_KEY` has write access
- Check database schema matches scraper expectations
- Required fields: `component_id`, `title`, `price`, `condition`, `location`, `source`, `url`, `date_posted`, `seller_username`, `is_active`, `price_is_reasonable`, `price_variance_percentage`

## Rate Limits

### Reddit API
- **Rate**: 60 requests per minute
- **Scraper**: 2 seconds between requests (30 requests/min)
- **OAuth**: Required for higher limits

### Supabase
- **Free tier**: 50,000 monthly API requests
- **Pro tier**: 500,000 monthly requests
- **Estimate**: ~1,000 requests per scrape run

## Future Improvements

1. **Incremental Scraping**: Only check components with recent activity
2. **Webhook Integration**: Real-time updates from Reddit
3. **Multi-source**: Add Head-Fi, USAudioMart scrapers
4. **Price Tracking**: Historical price data for trends
5. **Notification System**: Alert users about new listings matching their preferences
6. **Archive Old Listings**: Move inactive listings to archive table (>30 days)
7. **Duplicate Detection**: Advanced similarity matching for reposted items

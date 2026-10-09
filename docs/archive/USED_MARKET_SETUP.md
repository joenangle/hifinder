# Used Market Listings - Complete Setup Guide

This system scrapes Reddit r/AVexchange and eBay to populate real used market listings, replacing the current demo data.

## 🚀 Quick Start

### 1. Set Up API Credentials

#### Reddit API Setup
1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" → Choose "script" type
3. App name: `HiFinder-ListingAggregator`
4. Get your Client ID (14 chars) and Client Secret (27 chars)
5. Add to `.env.local`:
```bash
REDDIT_CLIENT_ID=your_reddit_client_id_here
REDDIT_CLIENT_SECRET=your_reddit_client_secret_here
```

#### eBay API Setup
1. Go to https://developer.ebay.com/
2. Create developer account and application
3. Get App ID, Dev ID, and Cert ID
4. Add to `.env.local`:
```bash
EBAY_APP_ID=your_ebay_app_id_here
EBAY_CERT_ID=your_ebay_cert_id_here
EBAY_DEV_ID=your_ebay_dev_id_here
```

### 2. Set Up Database Infrastructure
```bash
# Create necessary tables and functions
npm run scrape:setup
```

### 3. Test Individual Scrapers
```bash
# Test Reddit scraper
npm run scrape:reddit

# Test eBay scraper
npm run scrape:ebay
```

### 4. Run Full Aggregation
```bash
# Run complete scraping and processing pipeline
npm run scrape:all
```

## 📋 Available Commands

### Scraping Commands
- `npm run scrape:setup` - Set up database tables and infrastructure
- `npm run scrape:reddit` - Scrape Reddit r/AVexchange only
- `npm run scrape:ebay` - Scrape eBay marketplace only
- `npm run scrape:all` - Complete aggregation pipeline (recommended)

### Moderation Commands
- `npm run moderate moderate <listing_id> <action> [reason]` - Moderate specific listing
- `npm run moderate:report [days]` - Generate moderation report
- `npm run moderate:quality` - Run automated quality control

### Maintenance Commands
- `npm run cleanup:duplicates` - Remove duplicate listings
- `npm run archive:old` - Archive listings older than 30 days

## 🔄 Automated Scheduling (Every 2 Hours)

### Option 1: GitHub Actions (Recommended)
Create `.github/workflows/scrape-listings.yml`:

```yaml
name: Scrape Used Market Listings

on:
  schedule:
    - cron: '0 */2 * * *'  # Every 2 hours
  workflow_dispatch:  # Manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run scrape:all
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          REDDIT_CLIENT_ID: ${{ secrets.REDDIT_CLIENT_ID }}
          REDDIT_CLIENT_SECRET: ${{ secrets.REDDIT_CLIENT_SECRET }}
          EBAY_APP_ID: ${{ secrets.EBAY_APP_ID }}
          EBAY_CERT_ID: ${{ secrets.EBAY_CERT_ID }}
          EBAY_DEV_ID: ${{ secrets.EBAY_DEV_ID }}
```

### Option 2: Server Cron Job
```bash
# Add to your server's crontab
0 */2 * * * cd /path/to/hifinder && npm run scrape:all >> /var/log/hifinder-scrape.log 2>&1
```

### Option 3: Vercel Cron (if using Vercel)
Create `api/cron/scrape-listings.js`:
```javascript
import { runListingAggregation } from '../../scripts/listing-scheduler.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stats = await runListingAggregation();
    res.status(200).json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

## 🎯 Features Implemented

### ✅ Reddit r/AVexchange Scraper
- OAuth API authentication with fallback to public JSON
- Intelligent post filtering (selling posts only)
- Price extraction from various Reddit formats
- Condition and location parsing
- Component matching using brand/model recognition
- Rate limiting (2 seconds between requests)

### ✅ eBay Finding API Integration
- Full eBay Finding API integration
- Category-specific searches for audio equipment
- Seller reputation and feedback tracking
- Auction vs Buy-It-Now distinction
- Shipping cost and offer acceptance detection
- Condition mapping from eBay standards

### ✅ Intelligent Component Matching
- Fuzzy brand matching with aliases and typos
- Model number recognition and variations
- Category validation
- Confidence scoring (minimum 30% threshold)
- Comprehensive database of audio brands and models

### ✅ Data Validation & Quality Control
- Price reasonableness checking against expected ranges
- Automated flagging of suspicious prices
- URL accessibility validation
- Duplicate detection by URL and content similarity
- Condition standardization

### ✅ Long-term Data Retention
- Automatic archiving of listings older than 30 days
- Price history tracking for market analysis
- Daily price averages by component and source
- Comprehensive error logging and monitoring

### ✅ Admin Moderation System
- Manual listing approval/rejection
- Batch moderation with flexible criteria
- Automated quality control rules
- Detailed moderation reporting
- Admin override capabilities

## 📊 Database Schema

The system creates several new tables:

- `used_listings_archive` - Long-term storage for price history
- `aggregation_stats` - Scraping run statistics and monitoring
- `aggregation_errors` - Error logging for debugging
- `listing_moderation` - Admin actions and moderation history
- `price_history` - Daily price trends by component

## 🔍 Monitoring & Analytics

### View Aggregation Statistics
```bash
npm run moderate:report 30  # Last 30 days
```

### Monitor Errors
Check `aggregation_errors` table in Supabase dashboard

### Price Trends
Query `price_history` table for market analysis

## 🛠️ Troubleshooting

### Common Issues

1. **Reddit API Rate Limits**
   - System automatically handles rate limiting
   - Falls back to public JSON API if OAuth fails

2. **eBay API Quota**
   - Free tier: 5,000 calls/day
   - Monitor usage in eBay developer dashboard

3. **Component Matching Issues**
   - Check `BRAND_ALIASES` in `component-matcher.js`
   - Add new brand variations as needed

4. **Database Permissions**
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly
   - RLS policies allow service role full access

### Debug Commands
```bash
# Test component matching
node scripts/component-matcher.js

# Validate single listing
node scripts/admin-moderation.js moderate <listing_id> flag "testing"

# Check database connectivity
node scripts/setup-aggregation-infrastructure.js
```

## 📈 Performance Expectations

- **Reddit**: ~50-100 new listings per day across all components
- **eBay**: ~200-500 new listings per day across all components
- **Processing Time**: 5-10 minutes per complete run
- **Storage**: ~1GB per year for full data retention
- **API Costs**: Free tiers sufficient for current volume

## 🔒 Security & Privacy

- All API credentials stored securely in environment variables
- No personal data collection beyond publicly available listings
- Respects platform rate limits and terms of service
- GDPR-compliant data handling (public marketplace data only)

## 🚀 Future Enhancements

Potential additions:
- Head-Fi marketplace integration
- ASR (Audio Science Review) classified integration
- Price drop notifications
- Machine learning for better component matching
- Real-time WebSocket updates
- Advanced price prediction models

---

## 📞 Support

If you encounter issues:
1. Check the error logs in `aggregation_errors` table
2. Verify API credentials are correct
3. Test individual components with debug commands
4. Review rate limiting and quotas
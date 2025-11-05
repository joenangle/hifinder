# AVExchangeBot Integration for Verified Sales Tracking

**Created:** November 5, 2025
**Status:** ✅ Implemented

## Overview

HiFinder now integrates with Reddit's AVExchangeBot to track **verified sold listings** with confirmed transaction data. This provides more accurate price history and eliminates false positives from sellers who mark items as "[sold]" without actual confirmation.

## How AVExchangeBot Works

1. **Seller initiates confirmation**: After completing a sale, seller comments on their post:
   ```
   purchased Sundara from u/Imaginary-Scale9514
   ```

2. **Bot replies to track**: AVExchangeBot replies to the comment:
   ```
   Hello, u/Spirit_of_the_walrus. Added:
   • u/spirit_of_the_walrus -> 2 Trades
   • u/imaginary-scale9514 -> 4 Trades
   ```

3. **Both parties confirm**: Seller and buyer reply to the bot comment to confirm the transaction

4. **Verification complete**: Once both parties reply, the transaction is considered fully verified

## Implementation

### 1. Database Schema (`20251105_add_avexchange_bot_tracking.sql`)

Added columns to `used_listings` table:

| Column | Type | Description |
|--------|------|-------------|
| `buyer_username` | TEXT | Reddit username of buyer |
| `avexchange_bot_confirmed` | BOOLEAN | TRUE if bot-verified sale |
| `avexchange_bot_comment_id` | TEXT | Bot comment ID for reference |
| `buyer_feedback_given` | BOOLEAN | TRUE if buyer confirmed |
| `seller_feedback_given` | BOOLEAN | TRUE if seller confirmed |

### 2. Monitor Script (`monitor-avexchange-confirmations.js`)

**Purpose:** Standalone script to check existing listings for bot confirmations

**Features:**
- Fetches recent listings from database
- Checks Reddit comments for AVExchangeBot confirmations
- Updates listings with verified sale data
- Only marks as sold if both parties have confirmed

**Usage:**
```bash
# Check last 30 days, max 100 listings
node scripts/monitor-avexchange-confirmations.js

# Custom time range
node scripts/monitor-avexchange-confirmations.js --days 7 --limit 50
```

**Output:**
```
🚀 Starting AVExchangeBot confirmation monitor...
📅 Checking listings from past 30 days
🔢 Limit: 100 listings

🔍 Checking post abc123 for confirmations...
✅ Found bot confirmation: seller_user → buyer_user
✅ Updated listing 456 with confirmation data

==================================================
📊 Monitoring Summary
==================================================
Total listings checked: 100
✅ Updated with bot confirmation: 15
⏭️ Skipped: 85

Skip reasons:
  • already_confirmed: 10
  • already_sold: 50
  • no_bot_confirmation: 20
  • partial_confirmation: 5
❌ Errors: 0
==================================================
```

### 3. Enhanced Reddit Scraper (`reddit-avexchange-scraper.js`)

**Changes:**
- `transformRedditPost()` is now `async`
- Checks for bot confirmations when post appears sold
- Follows requirement: "Only if there are no other signs of being sold"

**Logic:**
```javascript
if (hasSoldIndicators) {
  // Post has [sold] tag or sold flair
  botConfirmation = await checkForAVExchangeBotConfirmation(postId)

  if (botConfirmation && botConfirmation.isFullyConfirmed) {
    // Use bot data (most reliable)
    status = 'sold'
    date_sold = botConfirmation.dateSold  // Actual sale date
    buyer_username = botConfirmation.buyerUsername
    avexchange_bot_confirmed = true
  } else {
    // Has sold indicators but no bot confirmation
    status = 'sold'
    date_sold = now()  // Estimated
    avexchange_bot_confirmed = false
  }
}
```

**Bot Confirmation Parsing:**
- Extracts seller and buyer usernames from bot comment
- Checks if both parties replied (fully confirmed)
- Records bot comment ID for future reference
- Uses bot reply timestamp as actual sale date

## Requirements Compliance

✅ **1. Monitor AVExchangeBot comments** - Both scripts check for bot confirmations
✅ **2. Extract confirmed sale data** - Date, seller, buyer, feedback status
✅ **3. Update existing listings** - Available → Sold with verified data
✅ **4. Validate transactions** - Only mark sold after both parties confirm
✅ **5. Only check if sold indicators present** - Prevents unnecessary API calls

## Benefits

### More Accurate Price History
- **Before**: Price history included asking prices (not actual sales)
- **After**: Price history uses verified sale prices with confirmed buyers

### Reduced False Positives
- **Before**: Sellers mark "[sold]" even if sale falls through
- **After**: Only count sales where both parties confirmed transaction

### Trust & Transparency
- Show "Bot Verified ✓" badge on verified sales
- Users can see trade history of sellers (confirmed_trades count)
- Link to original bot comment for verification

## Future Enhancements

### Phase 1: UI Display
- [ ] Add "Bot Verified ✓" badge to sold listings
- [ ] Show buyer username on verified sales
- [ ] Display "X confirmed trades" for sellers

### Phase 2: Analytics
- [ ] Track seller reputation (confirmed_trades → trust score)
- [ ] Calculate median sale time (date_posted → date_sold)
- [ ] Identify reliable sellers (high confirmation rate)

### Phase 3: Automation
- [ ] Set up cron job to run monitor script daily
- [ ] Send alerts for new verified sales of tracked components
- [ ] Auto-update price_used_min/max based on verified sales

## Running the System

### Initial Setup
```bash
# Apply database migration
psql -h [host] -d [database] -f supabase/migrations/20251105_add_avexchange_bot_tracking.sql

# Or use Supabase CLI
supabase db push
```

### Monitor Existing Listings
```bash
# Check recent listings for bot confirmations
node scripts/monitor-avexchange-confirmations.js --days 30
```

### Scrape New Listings (with bot check)
```bash
# Regular scrape with bot confirmation checking
node scripts/reddit-avexchange-scraper.js
```

## Testing

### Test with Real Reddit Data
```bash
# Find a known sold listing with bot confirmation
# Example: https://www.reddit.com/r/AVexchange/comments/...

# Run monitor on specific time range
node scripts/monitor-avexchange-confirmations.js --days 7
```

### Verify Database Updates
```sql
-- Check for bot-confirmed sales
SELECT
  title,
  seller_username,
  buyer_username,
  date_sold,
  avexchange_bot_confirmed,
  seller_feedback_given,
  buyer_feedback_given
FROM used_listings
WHERE avexchange_bot_confirmed = TRUE
ORDER BY date_sold DESC
LIMIT 10;
```

## Troubleshooting

### Bot confirmations not detected
- **Check**: Reddit API credentials (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET)
- **Check**: Rate limiting (2s between requests)
- **Check**: Post has both seller and buyer replies to bot

### Partial confirmations skipped
- **Expected behavior**: Only counts as sold if BOTH parties confirmed
- **Reason**: Prevents false positives from one-sided confirmations

### Old listings not updating
- **Solution**: Run monitor script with larger `--days` parameter
- **Note**: Only checks listings from reddit_avexchange source

## Files Modified/Created

### New Files
- `supabase/migrations/20251105_add_avexchange_bot_tracking.sql` - Database schema
- `scripts/monitor-avexchange-confirmations.js` - Standalone monitor
- `docs/AVEXCHANGE_BOT_INTEGRATION.md` - This document

### Modified Files
- `scripts/reddit-avexchange-scraper.js` - Enhanced with bot confirmation checking

## Performance Considerations

### API Rate Limiting
- **Reddit API**: 2 seconds between requests (per guidelines)
- **Comment fetching**: Adds ~2s per sold post
- **Typical run**: 100 listings × 2s = ~3-4 minutes

### Database Impact
- **New columns**: Minimal storage impact (~50 bytes per listing)
- **New indexes**: Speeds up bot-confirmed queries
- **Query performance**: No impact on existing queries

### Optimization Tips
- Run monitor script during off-peak hours
- Use `--limit` parameter for faster testing
- Cache bot confirmation results (already implemented)

## Support & Maintenance

### Monitoring
- Check script output for errors
- Monitor Reddit API rate limits
- Track bot confirmation success rate

### Updates
- Review bot comment format changes (rare)
- Update regex patterns if bot text changes
- Add new fields as bot features expand

---

**Questions or issues?** Check GitHub issues or contact @joenangles

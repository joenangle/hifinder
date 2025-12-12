# Pricing Data Strategy for HiFinder

**Created:** December 2025
**Status:** Analysis & Recommendations

## Current State

### What We're Successfully Tracking ✅

1. **Reddit Listing Prices (100% coverage)**
   - Asking prices from r/AVexchange posts
   - 179+ active listings captured
   - Sold status detection: ~80-90% accuracy
   - **NEW:** Date sold timestamp for all detected sold items

2. **Reverb Listing Prices (490+ listings)**
   - Active "Buy It Now" prices
   - Real-time inventory from Reverb API
   - Condition, shipping cost, seller ratings
   - **NEW:** Enhanced sold status detection (sold/expired/removed)

3. **Database Infrastructure**
   - `used_listings` table with proper schema
   - Fields: `price`, `sale_price`, `date_sold`, `status`
   - Price history API endpoint functional
   - Indexes optimized for time-series queries

### Critical Gap ❌

**Actual Sale Prices: 0% coverage**

**Why:**
- Reddit sellers negotiate privately (DMs/comments)
- Final agreed price rarely posted publicly
- AVExchangeBot only confirms transaction, not price
- `sale_price` field exists but remains NULL

**Impact:**
- Price history API falls back to asking prices
- Trends show listing prices, not market reality
- Recommendations use static `price_used_min/max` fields
- No learning from actual transactions

## Reverb Pricing Options Analysis

### Option 1: Reverb Price Guide (Ideal but Limited Access)

**What It Is:**
- Official Reverb feature showing historical sold prices
- Based on completed transactions (real sale data)
- Filtered by condition (Mint, Excellent, Good, etc.)
- Updated in real-time as items sell

**How to Access (User Interface):**
- Web: Add `&showsold=true` to search URLs
- Mobile: Filter → Show Only → Sold Listings
- Price Guide page: https://reverb.com/price-guide

**API Access Status:**
- ❌ NOT documented in public Reverb API
- ❓ Unclear if available to API partners
- 🔐 Requires contacting Reverb API team
- 📧 Support: https://groups.google.com/forum/#!forum/reverb-api

**Potential Value:**
- **HIGH** - Real transaction prices, not asking prices
- Condition-specific (Mint vs Good pricing)
- Large dataset (Reverb processes 1000s of audio sales/month)
- Industry-standard pricing reference

**Next Steps:**
1. Contact Reverb API team via their Google Group
2. Request access to Price Guide data or sold listings endpoint
3. Explain use case: price recommendations for headphone buyers
4. Alternative: Explore partnership/affiliate relationship

**Sources:**
- [Reverb Price Guide Overview](https://reverb.com/price-guide)
- [How to Use Reverb Price Guide](https://reverb.com/news/how-to-use-the-reverb-price-guide)
- [Viewing Sold Listings on Reverb](https://help.reverb.com/hc/en-us/articles/211878648-Can-I-view-sold-or-ended-listings-on-Reverb)

### Option 2: Web Scraping Sold Listings (Grey Area)

**What It Is:**
- Scrape Reverb search results with `&showsold=true` parameter
- Extract sold prices from HTML/JavaScript responses
- Build historical database independent of API

**Technical Feasibility:**
- ⚠️ Requires browser automation (Puppeteer/Playwright)
- ⚠️ Content is JavaScript-rendered (dynamic loading)
- ⚠️ Rate limiting concerns (same as Head-Fi issue)
- ⚠️ May violate Reverb Terms of Service

**Legal/Ethical Concerns:**
- Reverb TOS likely prohibits automated scraping
- Could get IP banned or API access revoked
- Not sustainable long-term solution
- Risk to existing affiliate relationship

**Recommendation:** ❌ **DO NOT PURSUE**
- High risk, low reward
- Jeopardizes official API access
- Better to request proper API endpoint

### Option 3: Asking Price Trends (Current Best Option)

**What It Is:**
- Analyze trends in asking prices for sold items
- Track price direction over time (rising/falling markets)
- Use statistical models to estimate final prices

**Current Data Available:**
- Reddit: Asking prices + sold status + date sold ✅
- Reverb: Active listing prices + historical asking data
- Combined: 179+ Reddit + 490+ Reverb = 669+ data points

**Analysis Approaches:**

1. **Time-Series Trending:**
   - Track average asking price by month
   - Detect upward/downward trends
   - Adjust recommendations based on direction
   - Example: "HD 650 asking prices down 15% this quarter"

2. **Sold vs Active Price Differential:**
   - Compare sold asking prices to current active listings
   - Calculate "discount factor": sold_avg / active_avg
   - Apply factor to current listings for estimates
   - Example: Items typically sell for 92% of asking price

3. **Condition-Based Modeling:**
   - Track asking prices by condition (Mint, Excellent, Good)
   - Build condition premium curves
   - Estimate based on condition + age
   - Example: Excellent = 85% of new, Good = 70%

4. **Velocity Analysis:**
   - Time to sell = listing date → sold date
   - Fast-selling items likely priced correctly
   - Slow-selling items may be overpriced
   - Use velocity to weight price estimates

**Implementation Priority:**
1. ✅ **DONE:** Reddit scraper populates date_sold (Dec 2025)
2. 🔄 **NEXT:** Build time-series trend analyzer script
3. 📊 **THEN:** Calculate sold/active price differential
4. 🎯 **FINALLY:** Integrate trends into recommendations algorithm

**Feasibility:** ✅ **HIGH**
- All data already available in database
- No API limits or TOS concerns
- Conservative approach (underestimates better than overestimates)
- Can start with simple moving averages

### Option 4: Community-Reported Sale Prices (Long-Term)

**What It Is:**
- Allow users to report actual sale prices after transactions
- Build crowdsourced pricing database
- Incentivize reporting with badges/karma

**Benefits:**
- Real transaction data from community
- Covers private sales (not just marketplaces)
- User engagement feature (not just data collection)

**Challenges:**
- Requires user accounts/authentication
- Self-reported data quality concerns
- Critical mass needed for statistical validity
- Privacy concerns (exposing deal details)

**Recommendation:** ⏰ **FUTURE CONSIDERATION**
- Interesting long-term feature
- Requires product maturity first
- Wait until 10,000+ monthly active users
- Not a near-term priority

## Recommended Immediate Actions

### Phase 1: Fix Data Capture (COMPLETED ✅)

1. ✅ **Reddit date_sold population** (Dec 2025)
   - Scraper now sets date_sold for detected sold items
   - 80-90% of sold listings now timestamped
   - Enables time-series analysis

2. ✅ **Reverb sold status detection** (Dec 2025)
   - Enhanced status: 'sold' vs 'expired' vs 'removed'
   - Better data quality for inventory tracking
   - Sold listings preserved in database for history

3. ✅ **API filter fix** (Dec 2025)
   - Changed from `is_active` to `status='available'`
   - Sold items filtered from marketplace display
   - Historical data preserved for analysis

### Phase 2: Asking Price Analysis (NEXT - 2-3 days)

1. **Create trend analysis script:**
   ```bash
   scripts/analyze-price-trends.js
   ```
   - Query sold listings grouped by month
   - Calculate avg/median asking prices over time
   - Identify trending up/down components
   - Generate price index scores

2. **Build discount factor model:**
   ```bash
   scripts/calculate-discount-factors.js
   ```
   - Compare sold asking prices to current active listings
   - Calculate category-specific discount factors
   - Account for condition differences
   - Output: "Items typically sell for X% of asking"

3. **Velocity scoring:**
   ```sql
   -- Add to database queries
   SELECT
     component_id,
     AVG(date_sold - date_posted) as avg_days_to_sell,
     COUNT(*) as sold_count
   FROM used_listings
   WHERE status = 'sold' AND date_sold IS NOT NULL
   GROUP BY component_id
   ```

### Phase 3: Reverb API Partnership (PARALLEL - 1-2 weeks)

1. **Contact Reverb API Team:**
   - Email via Google Group forum
   - Subject: "Price Guide API Access for Audio Gear Recommendations"
   - Explain HiFinder use case
   - Request sold listings or Price Guide endpoint access

2. **Alternative: Affiliate Enhancement:**
   - We already have Reverb affiliate integration
   - Propose enhanced partnership with data access
   - Offer traffic/sales in exchange for pricing data
   - Win-win: we get data, they get more sales

3. **Fallback Plan:**
   - If API access denied, use Option 3 (trends only)
   - Still valuable for directional pricing signals
   - Better than nothing, worse than real data

### Phase 4: Integrate into Recommendations (1 week after Phase 2)

1. **Update recommendations algorithm:**
   - Currently uses static `price_used_min/max`
   - Add dynamic pricing from trend analysis
   - Weight: 70% static (stable) + 30% trends (responsive)

2. **Price estimate confidence scores:**
   - High confidence: 20+ sold listings in past 6 months
   - Medium: 5-19 sold listings
   - Low: <5 sold listings (fall back to static)

3. **User-facing price ranges:**
   - "Typically sells for $250-280 (based on 15 recent sales)"
   - "Market trending down -12% this quarter"
   - Transparency builds trust

## Success Metrics

### Short-Term (Next 3 Months)

- ✅ 90%+ of sold Reddit listings have date_sold timestamp
- 📊 Price trend analysis running weekly
- 📈 Discount factor calculated for top 50 components
- 🎯 Recommendations using trend-adjusted pricing

### Medium-Term (6 Months)

- 🤝 Reverb API partnership established (or fallback to trends only)
- 💰 Price estimates within 15% of actual market (measured via affiliate click-through)
- 📊 1000+ sold listings with historical price data
- 🔄 Automated weekly price index updates

### Long-Term (12 Months)

- 🏆 Industry-leading used pricing accuracy
- 📈 5000+ sold listings across all sources
- 🤖 ML model predicting sale prices (if sufficient data)
- 👥 Community-reported pricing feature (optional)

## Technical Architecture

### Data Flow (Current)

```
Reddit API → Scraper V3 → Database (price, status, date_sold)
                              ↓
Reverb API → Integration → Database (price, status, date_sold)
                              ↓
                        Price History API → Frontend
                              ↓
                        (Falls back to asking prices)
```

### Data Flow (Proposed - Phase 2)

```
Reddit API → Scraper V3 → Database (price, status, date_sold)
                              ↓
Reverb API → Integration → Database (price, status, date_sold)
                              ↓
                    Trend Analyzer (weekly cron)
                              ↓
                    price_trends table (new)
                    - component_id
                    - month
                    - avg_asking_price
                    - median_asking_price
                    - sold_count
                    - trend_direction
                    - discount_factor
                              ↓
                    Recommendations API (enhanced)
                    - Uses price_trends for dynamic pricing
                    - Falls back to static on low data
                              ↓
                        Frontend (price estimates)
```

### Database Schema (New Table)

```sql
CREATE TABLE price_trends (
  id SERIAL PRIMARY KEY,
  component_id INTEGER REFERENCES components(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Asking price statistics
  avg_asking_price NUMERIC(10,2),
  median_asking_price NUMERIC(10,2),
  min_asking_price NUMERIC(10,2),
  max_asking_price NUMERIC(10,2),

  -- Volume metrics
  sold_count INTEGER DEFAULT 0,
  active_count INTEGER DEFAULT 0,

  -- Trend indicators
  trend_direction VARCHAR(10), -- 'up', 'down', 'stable'
  trend_percentage NUMERIC(5,2), -- +/- % vs previous period
  discount_factor NUMERIC(5,2), -- sold_avg / active_avg

  -- Confidence
  confidence_score VARCHAR(10), -- 'high', 'medium', 'low'
  data_quality_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(component_id, period_start)
);

CREATE INDEX idx_price_trends_component ON price_trends(component_id);
CREATE INDEX idx_price_trends_period ON price_trends(period_start DESC);
```

## Conclusion

**Reality Check:**
- We will NEVER get actual negotiated sale prices from Reddit (sellers don't share)
- Reverb Price Guide is ideal but access uncertain (requires partnership)
- Asking price trends are achievable NOW and provide real value

**Best Path Forward:**
1. ✅ **COMPLETED:** Fix data capture (date_sold, status filtering)
2. 🎯 **IMMEDIATE:** Build asking price trend analysis (2-3 days)
3. 🤝 **PARALLEL:** Request Reverb API partnership (1-2 weeks response time)
4. 📊 **INTEGRATE:** Dynamic pricing in recommendations (1 week after trends)

**Expected Outcome:**
- Conservative price estimates (better to underestimate than overestimate)
- Directional market signals (trending up/down)
- Confidence scores (transparent about data quality)
- Foundation for ML models if we get real sale data later

**Risk Mitigation:**
- Keep static pricing as fallback (current system)
- Weight trends at 30% initially (test & learn)
- Transparent confidence scores (don't oversell accuracy)
- Iterative improvement as data quality increases

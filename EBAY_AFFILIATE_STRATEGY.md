# eBay Affiliate Integration Strategy for HiFinder

## Problem
eBay API License Agreement prohibits:
- Displaying eBay listings on competitor sites
- Using eBay data for price comparison/modeling
- Storing/redistributing eBay listing data

## Solution: eBay Partner Network (Affiliate Links)

### What We Can Do
✅ Link to eBay search results via affiliate program
✅ Earn commission on purchases (4-8% for electronics)
✅ Calculate trends from non-eBay sources (Reddit, Head-Fi, Manual)
✅ Show "Check eBay" buttons with deep links to specific searches

### What We Cannot Do
❌ Display individual eBay listings
❌ Show eBay prices in comparison tables
❌ Store/cache eBay listing data
❌ Use eBay data in our price calculations

## Implementation Plan

### Phase 1: Remove eBay API Integration
- [x] Remove eBay scraper from aggregation pipeline
- [ ] Remove eBay listings from database
- [ ] Update UI to remove eBay listing cards

### Phase 2: Add eBay Affiliate Links
- [ ] Join eBay Partner Network (epn.ebay.com)
- [ ] Get Campaign ID / Tracking ID
- [ ] Create affiliate link generator function
- [ ] Add "Check eBay" CTA buttons to:
  - Component detail pages
  - Recommendation cards
  - Used listings sections

### Phase 3: Price Trend System (Non-eBay Sources)

#### Data Sources for Trends:
1. **Reddit r/AVexchange** - Most reliable, enthusiast pricing
2. **Head-Fi classifieds** - High-end gear, condition-aware
3. **Reverb** - Pro audio crossover
4. **Manual curated** - Verified deals we've found

#### Trend Calculations:
```sql
CREATE TABLE price_history (
  id uuid PRIMARY KEY,
  component_id uuid REFERENCES components(id),
  avg_price numeric,
  median_price numeric,
  listing_count integer,
  period_start date,
  period_end date,
  sources text[], -- ['reddit_avexchange', 'head_fi', 'manual']
  created_at timestamptz DEFAULT now()
);

-- Weekly aggregation
CREATE FUNCTION calculate_weekly_price_trends() ...
```

#### Trend Indicators:
- 📈 **Trending Up**: Avg price increased >5% in 30 days
- 📉 **Trending Down**: Avg price decreased >5% in 30 days
- ➡️ **Stable**: Price variance <5%
- 🔥 **Hot Item**: >10 listings/week (high supply)
- 💎 **Rare**: <2 listings/month (low supply)

### Phase 4: UI Components

#### Component Detail Page:
```jsx
<PriceTrendSection>
  <TrendChart data={priceHistory} />
  <PriceStats>
    <stat>Current Avg: $285 (↓ 3% vs 30d ago)</stat>
    <stat>Typical Range: $270-$310</stat>
    <stat>Sample: 42 listings (Reddit: 28, Head-Fi: 14)</stat>
  </PriceStats>

  <UsedListings source="reddit" count={5} />
  <UsedListings source="head_fi" count={3} />

  <EbayAffiliateCTA>
    <button>Check Current eBay Prices →</button>
    <disclaimer>Affiliate link - HiFinder may earn commission</disclaimer>
  </EbayAffiliateCTA>
</PriceTrendSection>
```

#### Recommendations Page:
```jsx
<ComponentCard component={hd600}>
  <UsedMarketSummary>
    <badge>Used: $270-$310</badge>
    <badge>Trending: ↓ 3%</badge>
    <badge>5 available on Reddit</badge>
  </UsedMarketSummary>

  <actions>
    <button>View Used Listings</button>
    <button>Check eBay</button> {/* Affiliate link */}
    <button>Buy New on Amazon</button> {/* Affiliate link */}
  </actions>
</ComponentCard>
```

## eBay Affiliate Link Format

### Basic Search Link:
```
https://ebay.us/CAMPAIGN_ID?keyword=Sennheiser+HD600
```

### Advanced Parameters:
```javascript
function generateEbayAffiliateLink(component, campaignId) {
  const params = new URLSearchParams({
    mkevt: '1',
    mkcid: '1',
    mkrid: '711-53200-19255-0',
    campid: campaignId,
    toolid: '10001',
    keyword: `${component.brand} ${component.name}`,
    // Optional filters
    LH_ItemCondition: '3000', // Used
    _sop: '15', // Price + shipping: lowest first
    LH_BIN: '1' // Buy It Now only
  });

  return `https://www.ebay.com/sch/i.html?${params}`;
}
```

## Revenue Potential

### eBay Partner Network Commission Rates:
- Electronics: 4-8%
- Average headphone sale: $300
- Commission per sale: $12-24

### Projected Revenue (Conservative):
- 1,000 monthly active users
- 5% click-through to eBay: 50 clicks
- 10% conversion: 5 purchases
- Avg commission: $15
- **Monthly: $75**
- **Annual: $900**

### Compared to:
- Reddit listings: $0 (free to aggregate)
- Amazon affiliate: Already implemented
- Total affiliate revenue potential: $2k-5k/year

## Benefits of This Approach

### Legal ✅
- Fully compliant with eBay TOS
- No competitive concerns
- No data redistribution issues

### Revenue ✅
- Earn commission on purchases
- Passive income from existing traffic
- Complements Amazon affiliate

### User Experience ✅
- Still show Reddit/Head-Fi listings with prices
- Provide eBay as additional option
- Trust through transparency

### Technical ✅
- No API maintenance/rate limits
- No data storage requirements
- Simple link generation

## Migration Checklist

### Database:
- [ ] Delete all eBay listings from used_listings table
- [ ] Remove 'ebay' from source enum (or keep for historical)
- [ ] Create price_history table for trend tracking

### Code:
- [ ] Remove scripts/ebay-integration.js from aggregator
- [ ] Update UsedListingsSection.tsx to hide eBay filter
- [ ] Create EbayAffiliateButton.tsx component
- [ ] Update component detail pages with affiliate CTAs

### Configuration:
- [ ] Join eBay Partner Network
- [ ] Add EBAY_CAMPAIGN_ID to .env.local
- [ ] Update CLAUDE.md with affiliate strategy

### Testing:
- [ ] Verify affiliate links track correctly
- [ ] Test commission attribution
- [ ] Monitor click-through rates

## Next Steps

1. **Immediate**: Remove eBay API integration
2. **Week 1**: Join eBay Partner Network, get campaign ID
3. **Week 2**: Implement affiliate link generator + UI components
4. **Week 3**: Launch price trend system with Reddit/Head-Fi data
5. **Week 4**: Monitor performance, optimize placement

---

**Note**: This approach gives us 95% of the value (price trends, user benefit) with 0% of the legal risk, plus adds a new revenue stream through affiliate commissions.

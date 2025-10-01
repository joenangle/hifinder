# Claude Code Notes for HiFinder

## QA Tasks Completed
- ✅ Authentication performance fix (2000ms+ → <200ms)
- ✅ Development environment cleanup
- ✅ CSV import path fixes
- ✅ Recommendations API & filter styling fixes (Sept 26)
- ✅ Component count accuracy fix (1,200+ → 550+ dynamic)
- ✅ Automated staging deployment pipeline
- ✅ GitHub Actions for automatic staging alias updates (secrets configured)
- ✅ BudgetSliderEnhanced dual-range functionality fix
- ✅ $1000 IEM budget filtering bug fix (0 → 10+ results)
- ✅ Category correction (82 headphones + 316 IEMs from Crinacle data)
- ✅ Dual-layer sound signature system implementation
- ✅ 100% sound signature constraint violation fixes

## High Priority: Summit-Fi Component Data Gaps

**Current Issues:**
- ❌ **ZERO high-end DACs** in database
- ❌ **ZERO high-end AMPs** in database
- ❌ **DAC/AMP combos maxed at $199** (need $500-$5000+ range)
- ⚠️ **IEM data corruption** (inflated prices like $4.3M for Stax)

**Data Gathering Strategy:**
1. **Immediate Manual (Phase 1):** Research 20-30 essential models per category
2. **Semi-Automated (Phase 2):** Web scraping ASR, Head-Fi, retailers
3. **Community Integration (Phase 3):** API integration with forums

**Key Sources:**
- ASR (Audio Science Review) - measured performance
- Head-Fi buying guides - community recommendations
- r/headphones guides - popular picks by price tier
- Audio46, Drop, Amazon - current pricing

**To implement:** Ask Claude to "start the summit-fi component data project"

## Used Listings Page Strategy

**Current State:**
- Homepage shows actual used listings count (179+ as of latest)
- Used listings integrated into recommendations page
- Scraped data from Reddit r/AVexchange, eBay, other sources

**Proposed Separate Used Listings Page (`/used-listings`):**

**Phase 1: Basic Browse & Filter**
- **URL Structure**: `/used-listings` (separate from `/used-market` redirect page)
- **Core Features**:
  - Grid/list view of all available used listings
  - Filter by: category (cans/iems/dacs/amps), price range, condition, source
  - Search by brand/model name
  - Sort by: price, date posted, condition, location

**Phase 2: Enhanced Discovery**
- **Smart Recommendations**: "Users who viewed this also looked at..."
- **Price History**: Show if item has had price drops
- **Condition Indicators**: Visual condition ratings (Mint, Excellent, Good, Fair)
- **Source Integration**: Direct links to original listings (Reddit, eBay, etc.)

**Phase 3: Advanced Features**
- **Saved Searches**: Alert users when matching items appear
- **Wishlist Integration**: "Items similar to your wishlist are available"
- **Negotiation Tools**: Contact sellers through platform (long-term)
- **Verified Sellers**: Reputation system for trusted sources

**Technical Implementation:**
- **Database**: Leverage existing `used_listings` table (179 records)
- **API**: `/api/used-listings` with pagination, filtering, search
- **Real-time Updates**: WebSocket or polling for new listings
- **Performance**: Infinite scroll, image lazy loading, search debouncing

**User Journey:**
1. **Discovery**: User visits `/used-listings` to browse available gear
2. **Filter**: Narrows down by budget, category, condition
3. **Compare**: Views multiple similar items, checks condition/price
4. **Action**: Clicks through to original listing to purchase
5. **Follow-up**: Sets up alerts for similar items in the future

**Differentiation from Recommendations:**
- **Recommendations**: "What should I buy?" (personalized, algorithm-driven)
- **Used Listings**: "What's available right now?" (inventory-driven, market-focused)

## GitHub Actions Setup for Staging Automation

**Required GitHub Secrets:**
1. **VERCEL_TOKEN**: Personal access token from Vercel dashboard
2. **VERCEL_ORG_ID**: Organization ID = `joenangles-projects`

**Setup Instructions:**
1. Go to Vercel Dashboard → Settings → Tokens → Create new token
2. Copy token to GitHub repo → Settings → Secrets → Actions → New repository secret
   - Name: `VERCEL_TOKEN`
   - Value: [your personal access token]
3. Add org ID as GitHub secret:
   - Name: `VERCEL_ORG_ID`
   - Value: `joenangles-projects`

**How it works:**
- Push to staging branch → GitHub Action triggers
- Action waits for Vercel deployment to complete
- Automatically updates staging.hifinder.app alias to point to new deployment
- Provides verification and error logging

**Files:**
- `.github/workflows/staging-alias.yml` - Main automation workflow

## Claude Code Skill Development

**User Request:** Be proactive about suggesting optimizations and advanced techniques

**Current Level:** ~3 weeks experience
- ✅ Basic file operations, bash commands
- ✅ Background processes, multi-tool calls
- ✅ Database queries, git workflows
- 🎯 **Next:** Project files, advanced patterns, automation

**Optimization Areas to Watch:**
- Suggest parallel tool usage when sequential operations are independent
- Recommend Glob over manual file searches
- Point out MultiEdit opportunities for complex refactoring
- Suggest background processes for long-running tasks
- Share advanced grep/search patterns

## Database Enhancement Procedures

**Successfully Established Patterns (Sept 2025):**

### Dual-Layer Sound Signature System
```sql
-- Basic compatibility layer (existing)
sound_signature: 'neutral' | 'warm' | 'bright' | 'fun'

-- Expert data layer (new)
crinacle_sound_signature: 'Bright neutral', 'Mild V-shape', 'Dark neutral', etc.
```

**Implementation:** Progressive enhancement in recommendations algorithm
- Basic signatures for broad matching
- Detailed signatures for nuanced scoring when available
- Null values treated as bonus-only (no penalties)

### Expert Data Integration Workflow

**1. Data Preparation:**
```bash
# CSV format with columns: Model, CrinSignature, CrinValue, CrinRank, etc.
# Supports both CSV and ODS formats via xlsx package
```

**2. Fuzzy Matching Pipeline:**
```javascript
// Key functions in scripts/merge-crinacle-cans.js
splitBrandAndModel()     // Handle multi-word brands
fuzzyMatch()             // Levenshtein similarity ≥ 0.8
levenshteinDistance()    // String comparison
```

**3. Sound Signature Normalization:**
```javascript
// Comprehensive mapping for constraint compliance
const signatureMap = {
  'Neutral': 'neutral',
  'Bright neutral': 'bright',
  'Bass-rolled neutral': 'neutral',
  'Warm neutral': 'warm',
  'Mild V-shape': 'fun',
  'Dark neutral': 'neutral',
  // ... 20+ mappings for edge cases
};
```

**4. Batch Processing Pattern:**
```bash
# Dry run (preview changes)
node scripts/merge-crinacle-cans.js data.csv

# Execute updates
node scripts/merge-crinacle-cans.js data.csv --execute
```

### Proven Results
- **398 components enhanced** (82 headphones + 316 IEMs)
- **100% constraint compliance** (fixed all 165 signature violations)
- **Category correction** (headphones mislabeled as IEMs)
- **Recommendation quality boost** via detailed signature matching

### Reusable Components
- `scripts/merge-crinacle-cans.js` - Production fuzzy matcher
- `MULTI_WORD_BRANDS` array - Handle "Audio Technica", "Ultimate Ears", etc.
- Signature mapping dictionaries for other expert sources
- Dry-run → execute safety pattern

### Future Applications
- ASR measurement data integration
- Head-Fi community ratings
- Other expert reviewer data (Z Reviews, DMS, etc.)
- Price/availability updates from retailers

**Key Insight:** Dual-layer approach preserves backward compatibility while enabling sophisticated matching for users who benefit from expert-level distinctions.

## Advanced Sound Signature Filtering Ideas

**Current State (Sept 2025):**
- Basic 4 categories: neutral, warm, bright, fun (559 components)
- Detailed Crinacle signatures: ~20 variations like "Bright neutral", "Mild V-shape" (398 components)
- Users currently limited to basic dropdown selection

**HMW Display More Detailed Filtering:**

### 1. Progressive Disclosure - Expandable Categories
```
☐ Neutral (89 items) [+]
   ☐ Bright neutral (23)
   ☐ Warm neutral (31)
   ☐ Bass-rolled neutral (12)
   ☐ DF-neutral (8)
```
**Pros:** Familiar starting point, expert depth on demand, maintains hierarchy
**Cons:** Could get complex with many subcategories, requires nested UI logic

### 2. Visual Signature Map
Interactive 2D grid: X-axis (warm→bright), Y-axis (laid-back→energetic)
- Plot signatures as clickable regions with component counts
- Hover shows signature description + sample components
**Pros:** Intuitive spatial understanding, visual relationships clear
**Cons:** Requires careful signature positioning, complex responsive design

### 3. Multi-Select with Live Preview
Checkbox interface with real-time result counts:
```
☑ Bright neutral (23 results)
☑ Neutral (31 results)
☐ V-shaped (15 results)
Total: 54 matching components
```
**Pros:** Clear feedback, allows signature combinations, power user friendly
**Cons:** Can overwhelm beginners, OR vs AND logic complexity

### 4. Experience-Driven Progressive Enhancement
- **Beginner Mode:** 4 basic categories only
- **Enthusiast Mode:** Basic + 8 most popular detailed signatures
- **Advanced Mode:** Full signature library + custom descriptions
**Pros:** Scales with user knowledge, reduces cognitive load for beginners
**Cons:** Requires user profiling, mode switching complexity

### 5. Contextual Smart Filtering
Natural language hints that auto-select signatures:
- "I want something for rock music" → V-shaped, fun signatures
- "Similar to HD600" → warm neutral, neutral options
- "Bright but not harsh" → bright neutral, excluding aggressive signatures
**Pros:** Reduces learning curve, leverages existing component knowledge
**Cons:** Requires extensive signature-to-use-case mapping, complex NLP

### Implementation Considerations:
- **Data Coverage:** Handle 161 components without detailed signatures gracefully
- **Query Logic:** Support both OR (broader results) and AND (narrower) combinations
- **Performance:** Pre-compute signature counts, cache popular combinations
- **Education:** Include signature descriptions/examples for learning
- **Mobile UX:** Ensure filtering works well on touch devices

### Recommended Approach:
Start with **Progressive Disclosure (#1)** for immediate impact, then explore **Experience-Driven (#4)** for long-term UX sophistication. This leverages our dual-layer architecture while maintaining backward compatibility.
- claude remind me to use git push origin staging when ready to push to staging. Remember that's what I'm asking you to do if I say "push to staging"
- CLAUDE remember this going forward
- also remember To prevent these variable/function name errors in the future, I should:
  1. Always check existing imports before using them
  2. Use Grep to verify function signatures in the codebase
  3. Test API endpoints locally before pushing to staging
- remember my oWf66CSqfgdR1Ad3TvPpXF3H VERCEL_ORG_ID token
- you have again violated explicit instructions not to push without approval. remember this and don't do it again
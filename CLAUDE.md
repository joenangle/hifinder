# Claude Code Notes for HiFinder

## QA Tasks Completed
- ✅ Authentication performance fix (2000ms+ → <200ms)
- ✅ Development environment cleanup
- ✅ CSV import path fixes
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
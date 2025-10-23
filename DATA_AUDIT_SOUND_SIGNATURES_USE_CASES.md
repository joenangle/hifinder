# Data Audit: Sound Signatures & Use Cases

**Date:** October 2024
**Status:** 🔴 **CRITICAL GAPS IDENTIFIED**

---

## TL;DR

**Sound Signatures:** ✅ Good coverage (100% basic, 71% detailed)
**Use Cases:** 🔴 **USELESS** - 100% of components have `use_cases: ['music']` only

---

## Sound Signature Coverage

### Data Sources

**1. Basic Sound Signatures (sound_signature field)**
- Coverage: ~100% (manually assigned during import)
- Values: `neutral`, `warm`, `bright`, `fun`
- Source: Manual categorization based on general knowledge
- Quality: **Good** - provides basic filtering capability

**2. Detailed Crinacle Signatures (crinacle_sound_signature field)**
- Coverage: 71% (398 of ~560 headphones/IEMs)
- Values: ~20 variations like "Bright neutral", "Mild V-shape", "Dark neutral"
- Source: Crinacle's expert measurements
- Quality: **Excellent** - provides nuanced matching

### How Sound Signatures Are Determined

**From import scripts (e.g., add-comprehensive-iems.js):**
```javascript
{
  name: 'Sennheiser HD 650',
  sound_signature: 'warm',  // Manually assigned
  use_cases: ['music'],      // All the same!
  ...
}
```

**From Crinacle merge (merge-crinacle-cans.js):**
```javascript
// Maps detailed Crinacle signatures to basic 4 categories
const signatureMap = {
  'Neutral': 'neutral',
  'Bright neutral': 'bright',
  'Warm neutral': 'warm',
  'Mild V-shape': 'fun',
  'Dark neutral': 'neutral',
  // ... 20+ mappings
}
```

### Assessment: Sound Signatures

✅ **GOOD** for recommendations:
- 100% coverage on basic signatures
- 71% coverage on detailed signatures
- Dual-layer system provides both broad filtering and nuanced matching
- Scoring at 20% weight is appropriate

---

## Use Case Coverage

### Data Reality

**From database imports:**
```javascript
// Every single component has this:
use_cases: ['music']
```

**Coverage:** 100% have use_cases, but **0% have useful differentiation**

### The Problem

**Current algorithm weights use case at 10%** of final score, but:
- All components score **identically** (10% for matching 'music')
- A gaming headset and studio monitor get the same use case score
- The 10% weight is **wasted** - effectively random noise

### Why This Happened

Looking at import scripts:
- All components manually added with generic `use_cases: ['music']`
- Crinacle data doesn't include use case information
- ASR data doesn't include use case information
- No other structured data source for use cases

### Real-World Use Case Distinctions

**Gaming:**
- Wide soundstage for positioning
- Good imaging for directional cues
- Boom mic compatibility
- Examples: HD 560S, PC38X, Audeze Maxwell

**Studio/Mixing:**
- Flat/neutral frequency response
- High detail retrieval
- Comfort for long sessions
- Examples: HD 600, DT 1990 Pro, Audeze LCD-X

**Portable/Travel:**
- Closed-back isolation
- Low impedance (easy to drive)
- Folding/compact design
- Examples: Most IEMs, Sony WH-1000XM5, Meze 99 Classics

**Movies/Immersive:**
- Bass emphasis for explosions
- Wide soundstage
- Fun/engaging signature
- Examples: V-Moda M-100, Fostex TH-X00, Focal Elegia

---

## Immediate Implications for Recommendation Algorithm

### Current Scoring Weights (Proposed v2.0)
```
Performance: 70%
Signature:   20%
Use Case:    10%  ← BROKEN
```

### Actual Effective Weights
```
Performance: 77.8%  (70% / 0.9)
Signature:   22.2%  (20% / 0.9)
Use Case:    0%     (meaningless data)
```

**The use case weight is being applied randomly** since all components have the same value.

---

## Recommendations

### Option 1: Remove Use Case Scoring (Short-term)

**Reweight to:**
```
Performance: 78%  (70% / 0.9)
Signature:   22%  (20% / 0.9)
Use Case:    0%   (removed until we have real data)
```

**Pros:**
- Honest about data limitations
- Doesn't pretend to score on meaningless data
- Simpler algorithm

**Cons:**
- Loses potential future capability
- Can't differentiate gaming vs studio headphones

### Option 2: Infer Use Cases from Component Characteristics (Medium-term)

Use existing data to make educated guesses:

```javascript
function inferUseCases(component) {
  const cases = []

  // All headphones/IEMs are suitable for music
  cases.push('music')

  // Gaming indicators
  if (component.name.includes('Gaming') ||
      component.name.includes('PC38X') ||
      component.impedance <= 64 && component.category === 'cans') {
    cases.push('gaming')
  }

  // Studio indicators (neutral signature + high-end)
  if ((component.sound_signature === 'neutral' ||
       component.crinacle_sound_signature?.includes('neutral')) &&
      component.avgPrice >= 300) {
    cases.push('studio')
  }

  // Portable indicators (IEMs, low impedance, closed-back)
  if (component.category === 'iems' ||
      component.impedance <= 32) {
    cases.push('travel')
  }

  // Movies indicators (fun signature, wide soundstage)
  if (component.sound_signature === 'fun') {
    cases.push('movies')
  }

  return cases
}
```

**Pros:**
- Better than current state
- Uses available data intelligently
- Can be improved incrementally

**Cons:**
- Still heuristic/guesses
- May misclassify edge cases
- Requires maintenance

### Option 3: Crowdsource Use Case Data (Long-term)

**Implementation:**
- Add user voting: "I use this for [gaming] [studio] [travel] [movies]"
- Track voting data in separate table
- Weight by number of votes (more votes = more confidence)
- Show community-validated use cases

**Pros:**
- Real user data
- Self-improving over time
- Engages community

**Cons:**
- Requires UI development
- Needs moderation (spam prevention)
- Takes time to accumulate data

### Option 4: Manual Expert Curation (Medium-term)

Go through top 100-200 most popular components and manually assign proper use cases based on:
- Online reviews
- Community forums (r/headphones, Head-Fi)
- Manufacturer marketing
- Expert recommendations

**Pros:**
- Highest quality for popular items
- Can be done relatively quickly
- Sets standard for future additions

**Cons:**
- Doesn't scale
- Requires ongoing maintenance
- Subjective judgment calls

---

## My Recommendation: Hybrid Approach

### Phase 1 (Immediate): Remove Use Case Scoring
- Update algorithm to 78% performance / 22% signature
- Document that use case filtering is not currently available
- Don't waste 10% of score on meaningless data

### Phase 2 (Next 2 weeks): Manual Curation of Top 100
- Manually assign proper use cases to 100 most popular components
- Focus on items with >500 views or in top recommendations
- Use expert reviews + community consensus
- This covers 80% of actual recommendations served

### Phase 3 (Next month): Inference Heuristics
- Implement smart inference for remaining components
- Use characteristics (impedance, signature, price, name)
- Better than nothing, can be refined over time

### Phase 4 (3-6 months): Community Validation
- Add user voting for use cases
- Weight community data alongside expert curation
- Continuous improvement

---

## Use Case Scoring Formula (Once We Have Real Data)

```javascript
function calculateUseCaseScore(component, primaryUsage) {
  const useCases = component.use_cases || []

  // Perfect match: Primary use case is listed
  if (useCases.includes(primaryUsage)) {
    return 1.0  // 100% match
  }

  // Partial matches (related use cases)
  const relatedCases = {
    'gaming': ['music', 'movies'],      // Gaming headphones often good for music
    'studio': ['music'],                 // Studio gear is for critical music listening
    'movies': ['gaming', 'music'],      // Movies gear often works for gaming
    'travel': ['music'],                // Travel gear is primarily for music
    'music': []                          // Music is not a substitute for specialized uses
  }

  const related = relatedCases[primaryUsage] || []
  const hasRelated = useCases.some(uc => related.includes(uc))

  if (hasRelated) {
    return 0.5  // 50% match for related use cases
  }

  // No match: Still usable, just not optimized
  return 0.0  // No penalty, just no bonus
}
```

---

## Updated Recommendation Algorithm (v2.1)

### Current Reality

```javascript
// BEFORE (v2.0 - with broken use case scoring)
finalScore = (
  performanceScore * 0.70 +
  signatureScore * 0.20 +
  useCaseScore * 0.10        // All components score identically = noise
)

// AFTER (v2.1 - honest about data limitations)
finalScore = (
  performanceScore * 0.78 +  // Reweighted (70% / 0.9)
  signatureScore * 0.22      // Reweighted (20% / 0.9)
)
// Use case scoring removed until we have real data
```

### Future (v2.2 - with curated use case data)

```javascript
finalScore = (
  performanceScore * 0.70 +
  signatureScore * 0.20 +
  useCaseScore * 0.10        // Meaningful scoring once data exists
)
```

---

## Action Items

- [ ] **HIGH PRIORITY:** Update recommendation algorithm to remove use case scoring (v2.1)
- [ ] **HIGH PRIORITY:** Document this limitation in user-facing "How It Works" page
- [ ] **MEDIUM PRIORITY:** Manually curate use cases for top 100 components
- [ ] **MEDIUM PRIORITY:** Implement inference heuristics for remaining components
- [ ] **LOW PRIORITY:** Build community voting feature for use case validation

---

## Conclusion

**Sound signatures:** ✅ Excellent data, ready for 20-22% weight in scoring
**Use cases:** 🔴 Currently useless, remove from scoring until we have real data

This is a data problem, not an algorithm problem. Once we have proper use case data (manual curation or crowdsourcing), we can reintroduce the 10% use case weight. Until then, honesty about data limitations is better than pretending to score on meaningless information.

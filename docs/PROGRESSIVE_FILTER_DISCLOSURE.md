# Progressive Filter Disclosure Strategy

**Date:** October 2024
**Status:** ✅ **Phase 1 Implemented** (Equipment + Sound Signature Progressive Disclosure)
**Principle:** Show filters that match user's knowledge level and needs

---

## Implementation Status

**✅ Completed (Phase 1):**
- Equipment filter visibility based on browse mode (hidden in "guided")
- Sound signature label simplification in guided mode:
  - Neutral → "Balanced"
  - Warm → "Bass-focused"
  - Bright → "Treble-focused"
  - V-Shaped → "Exciting"
- Filter counts showing on all buttons
- BrowseModeSelector integration

**🔄 Pending (Phase 2):**
- Form factor filter (open/closed back) - awaiting data cleanup
- Driver type filter for advanced mode
- Impedance range filter for advanced mode
- Detailed Crinacle signatures for advanced mode

---

## TL;DR

**Problem:** Different users need different levels of detail
- **"Show me top picks" users:** Want simple, jargon-free choices
- **"Let me explore" users:** Want balance of simplicity and control
- **"Full control" users:** Want every technical detail available

**Solution:** Progressive disclosure - reveal complexity as user expertise increases

---

## The Three Browse Modes (from BrowseModeSelector)

### Mode 1: "Show me top picks" (guided)
**User mindset:** "I don't know much, just show me good options"
**Result count:** 3-5 items
**Cognitive load:** Minimize - focus on essentials only

### Mode 2: "Let me explore" (explore)
**User mindset:** "I want to compare options and understand differences"
**Result count:** 5-8 items
**Cognitive load:** Moderate - show useful filters, hide jargon

### Mode 3: "Full control mode" (advanced)
**User mindset:** "I know exactly what I want, show me everything"
**Result count:** 10+ items
**Cognitive load:** High acceptable - power user wants granular control

---

## Filter Disclosure by Mode

### Always Visible (All Modes)

**Budget Slider**
- Everyone needs price control
- Universal concept, no jargon

**Equipment Type**
```
☐ Headphones (82)
☐ IEMs (316)
☐ DACs (50)
☐ Amps (35)
☐ Combos (12)
```
- Clear categories, self-explanatory
- Icons help visual recognition

---

### Mode 1: "Show me top picks" - MINIMAL FILTERS

**Show only:**

**Sound Preference** (simplified language)
```
What sound do you prefer?
☐ Balanced (89)        - "Even sound across all frequencies"
☐ Bass-focused (67)    - "More thump and warmth"
☐ Bright (42)          - "More sparkle and clarity"
☐ Exciting (91)        - "Emphasized bass and treble"
```

**That's it.** No other filters visible.

**Rationale:**
- Beginners are overwhelmed by choices
- Sound preference + budget + our algorithm = good enough
- Hide: form factor, driver type, all technical specs
- Trust the algorithm to show best-performing options

**UI Design:**
```
┌─────────────────────────────────────────┐
│ 💰 Budget: $300                         │
│ 8 items available                       │
├─────────────────────────────────────────┤
│ What sound do you prefer?               │
│ [Balanced] [Bass-focused] [Bright] [Exciting] │
└─────────────────────────────────────────┘

↓ Top 3 Recommendations ↓
```

---

### Mode 2: "Let me explore" - USEFUL FILTERS

**Show:**

**1. Equipment Type** (as before)
```
Equipment:
☐ Headphones (82)  ☐ IEMs (316)
☐ DACs (50)  ☐ Amps (35)  ☐ Combos (12)
```

**2. Sound Signature** (original terminology, but with helpful icons)
```
Sound:
⚖️ Neutral (89)  🔥 Warm (67)  ✨ Bright (42)  🎉 V-Shaped (91)
```

**3. Form Factor** (plain language, conditional)
*Only shown when "Headphones" is selected*
```
Type:
🌬️ Open-back (65)     - "Wide sound, leaks audio"
🔒 Closed-back (35)   - "Isolated, no leakage"
```

**Hide:**
- Driver types (too technical)
- Crinacle detailed signatures (enthusiast-level)
- Impedance ranges (handled by "needs amp" badge)
- Specific technical measurements

**Rationale:**
- These users want to **compare and understand**
- Form factor is useful (open vs closed is practical)
- Sound signatures are learnable (icons help)
- Technical details would distract from decision-making

**UI Design:**
```
┌────────────────────────────────────────────┐
│ Equipment:                                  │
│ [☑ Headphones 82] [☐ IEMs 316] ...        │
├────────────────────────────────────────────┤
│ Sound:                                      │
│ [⚖️ Neutral 89] [🔥 Warm 67] ...          │
├────────────────────────────────────────────┤
│ Type: (for headphones)                     │
│ [🌬️ Open-back 65] [🔒 Closed-back 35]    │
└────────────────────────────────────────────┘
```

---

### Mode 3: "Full control mode" - ALL FILTERS

**Show everything:**

**1. Equipment Type** (as before)

**2. Sound Signature** (dual-layer with expansion)
```
Sound:
⚖️ Neutral (89)  🔥 Warm (67)  ✨ Bright (42)  🎉 V-Shaped (91)

[▼ Show detailed signatures]  ← Expandable

(Expanded view:)
Detailed signatures (from Crinacle):
☐ Bright neutral (23)
☐ Warm neutral (31)
☐ Bass-rolled neutral (12)
☐ Mild V-shape (45)
☐ Dark neutral (12)
... (show all ~20 options)
```

**3. Form Factor** (technical terminology is fine here)
```
Form Factor:
🌬️ Open circumaural (65)
🔒 Closed circumaural (35)
🎧 On-ear / Supra-aural (8)
```

**4. Driver Type** (NEW - enthusiasts care about this)
```
Driver Technology:
☐ Dynamic (45)           - "Traditional moving coil"
☐ Planar magnetic (12)   - "Wide soundstage, fast response"
☐ Electrostatic (6)      - "Ultra-detailed, requires special amp"
☐ Hybrid (8)             - "Multiple driver types"
```

**5. Impedance Range** (NEW - for power matching)
```
Impedance:
☐ Low (≤32Ω) - Easy to drive
☐ Medium (33-150Ω) - May need amp
☐ High (>150Ω) - Requires amplification
```

**6. Special Features** (practical filters)
```
Features:
☐ Detachable cable
☐ Balanced connection option
☐ Replaceable pads
```

**Rationale:**
- Power users want **granular control**
- Technical terminology is expected (they know what "planar" means)
- More filters = more precise results
- These users enjoy exploring technical details

**UI Design:**
```
┌─────────────────────────────────────────────────┐
│ Equipment: [☑ Headphones] [☐ IEMs] ...         │
├─────────────────────────────────────────────────┤
│ Sound: [Neutral] [Warm] [Bright] [V-Shaped]    │
│ [▼ Show detailed signatures (20 options)]      │
├─────────────────────────────────────────────────┤
│ Form Factor: [Open] [Closed] [On-ear]          │
├─────────────────────────────────────────────────┤
│ Driver: [Dynamic] [Planar] [Electrostatic]     │
├─────────────────────────────────────────────────┤
│ Impedance: [Low ≤32Ω] [Med 33-150Ω] [High >150Ω]│
├─────────────────────────────────────────────────┤
│ Features: [Detachable cable] [Balanced] ...    │
└─────────────────────────────────────────────────┘
```

---

## Component Card Information Disclosure

### Mode 1: "Show me top picks" - MINIMAL INFO

**Show:**
```
┌────────────────────────────────────┐
│ 🎧 Sennheiser HD 650               │
│ $220                               │
│ ⭐⭐⭐⭐⭐ A+ Rated                 │
│                                    │
│ Warm, natural sound perfect for    │
│ music. Easy to drive.              │
│                                    │
│ [Add to Stack]                     │
└────────────────────────────────────┘
```

**Hide:**
- Technical specs (impedance, sensitivity)
- Driver type
- Detailed grades
- Expert measurements
- Crinacle rank

**Rationale:** Just show "it's good" and basic info

---

### Mode 2: "Let me explore" - BALANCED INFO

**Show:**
```
┌────────────────────────────────────┐
│ 🎧 Sennheiser HD 650               │
│ $220                               │
│ ⭐ A+ Tone, A Technical            │
│ 🌬️ Open-back • 300Ω              │
│                                    │
│ Warm, natural sound. Legendary     │
│ midrange. Requires amplification.  │
│                                    │
│ ⚠️ Needs amp for best performance │
│                                    │
│ [Compare] [Add to Stack]           │
└────────────────────────────────────┘
```

**Show (expandable "Details"):**
- Impedance: 300Ω
- Form factor: Open-back over-ear
- Driver: Dynamic
- Rank: #12 on Crinacle list

**Hide:**
- Sensitivity measurements
- Detailed frequency response data
- Power calculations

**Rationale:** Useful specs without overwhelming

---

### Mode 3: "Full control mode" - ALL INFO

**Show:**
```
┌────────────────────────────────────────────┐
│ 🎧 Sennheiser HD 650                       │
│ $220 (Save $80 vs budget)                  │
│ 🏆 Rank #12 • ⭐ A+ Tone, A Technical     │
│ 💎 Value Rating: 3/3 (Exceptional)        │
├────────────────────────────────────────────┤
│ 🌬️ Open circumaural • Dynamic driver     │
│ 300Ω impedance • 103dB/mW sensitivity     │
│ Requires 2.5Vrms for 110dB SPL            │
│                                            │
│ Warm neutral signature with legendary     │
│ midrange clarity. Industry reference.     │
│                                            │
│ ⚠️ Amplification: Demanding               │
│    Recommended: 200mW+ @ 300Ω            │
│                                            │
│ 🎛️ Crinacle: "Warm neutral"              │
│ 📊 Details: Detachable cable, replaceable │
│            pads, 3m cable included        │
│                                            │
│ [🔍 Full Specs] [Compare] [Add to Stack] │
└────────────────────────────────────────────┘
```

**Show everything:**
- All technical specs
- Expert commentary
- Detailed measurements
- Power requirements
- Accessory details
- Crinacle detailed signature

**Rationale:** Power users want ALL the data

---

## Language/Terminology by Mode

### Mode 1: "Show me top picks" - PLAIN LANGUAGE

| Technical Term | Plain Language |
|---------------|----------------|
| Neutral | Balanced |
| Fun / V-shaped | Exciting |
| Open circumaural | Open-back |
| Closed circumaural | Closed-back |
| Impedance | (Hide - just show "needs amp" badge) |
| Driver type | (Hide completely) |
| Planar magnetic | (Hide completely) |
| SINAD | (Hide completely) |

---

### Mode 2: "Let me explore" - ACCESSIBLE TECHNICAL

| Technical Term | Shown As | With Tooltip |
|---------------|----------|--------------|
| Neutral | Neutral | "Flat frequency response, accurate sound" |
| V-shaped | V-Shaped | "Emphasized bass and treble, recessed mids" |
| Open circumaural | Open-back | "Wide soundstage, natural sound. Leaks audio." |
| Closed circumaural | Closed-back | "Isolation, no leakage. Good for public use." |
| Impedance 300Ω | 300Ω | "High impedance - requires amplifier" |
| Driver type | (Hide - mentioned in card details only) |
| Planar magnetic | (Hide - mentioned in card details only) |

---

### Mode 3: "Full control mode" - FULL TECHNICAL

| Technical Term | Shown As | Explanation |
|---------------|----------|-------------|
| Neutral | Neutral | No explanation needed |
| Open circumaural | Open circumaural | (Can use proper audiophile terminology) |
| Closed circumaural | Closed circumaural | |
| Planar magnetic | Planar magnetic | (Assume user knows) |
| Electrostatic | Electrostatic | (Assume user knows) |
| SINAD | 120dB SINAD | Show actual measurements |
| DF-neutral | DF-neutral | Show Crinacle's exact terminology |

---

## Filter Visibility Logic (Code Perspective)

```typescript
interface FilterVisibility {
  // Always visible
  budget: true
  equipment: true

  // Mode-dependent
  sound: {
    basicSignatures: true  // All modes
    detailedSignatures: mode === 'advanced'  // Expand only for advanced
    simplifiedLabels: mode === 'guided'  // "Balanced" instead of "Neutral"
  }

  formFactor: {
    show: mode !== 'guided' && selectedEquipment.includes('headphones')
    terminology: mode === 'advanced' ? 'circumaural' : 'back'
  }

  driverType: {
    show: mode === 'advanced'
  }

  impedance: {
    show: mode === 'advanced'
    showInCard: mode === 'explore' || mode === 'advanced'
  }

  technicalMeasurements: {
    show: mode === 'advanced'
    showInCard: mode === 'advanced'
  }
}
```

---

## Progressive Disclosure in Action

### Scenario 1: Beginner Buys First IEMs

**Mode:** "Show me top picks"

**What they see:**
```
Budget: $50

Sound preference: [Balanced] ← Selected

Recommendations:
1. Truthear Zero - $50 ⭐⭐⭐⭐⭐
   "Excellent balanced sound, great for music"

2. Moondrop Chu - $20 ⭐⭐⭐⭐
   "Amazing value, balanced signature"
```

**What they DON'T see:**
- Form factor (IEMs are inherently closed)
- Driver type (1DD, 2DD+1BA, etc.)
- Impedance (irrelevant at this level)
- Detailed signatures

**Result:** Simple, confidence-inspiring choice

---

### Scenario 2: Intermediate User Wants Office Headphones

**Mode:** "Let me explore"

**What they see:**
```
Equipment: [☑ Headphones]
Sound: [☑ Neutral]
Type: [☑ Closed-back] ← They select this (no sound leakage)

Recommendations:
1. Beyerdynamic DT 770 Pro - $150
   🔒 Closed-back • 80Ω
   "Studio-quality closed headphones, V-shaped signature"

2. Audio-Technica M50x - $130
   🔒 Closed-back • 38Ω
   "Professional monitoring, easy to drive from laptop"
```

**What they see in details:**
- Impedance (to know if they need amp)
- Form factor (critical for their use case)
- Open/closed distinction

**What they DON'T see:**
- Driver type (not relevant to decision)
- Detailed power calculations
- Sensitivity measurements

**Result:** Found exactly what they need (closed-back, no leakage)

---

### Scenario 3: Enthusiast Building Summit-Fi System

**Mode:** "Full control mode"

**What they see:**
```
Equipment: [☑ Headphones]
Sound: [☑ Neutral] + [☑ Warm neutral] (detailed)
Form Factor: [☑ Open circumaural]
Driver: [☑ Planar magnetic]
Impedance: [☑ High (>150Ω)]

Recommendations:
1. Audeze LCD-X - $1200
   🏆 Rank #8 • A+ Tone, A+ Technical
   🌬️ Open circumaural • Planar magnetic
   20Ω (easy to drive despite size)
   130mW power recommendation
   105dB/mW sensitivity

   Crinacle: "Neutral with slight warmth"
   SINAD: N/A (headphone)

   [Full frequency response graph]
   [Detailed measurements]
```

**What they see:**
- Every technical detail
- Exact Crinacle terminology
- Driver technology
- Power calculations
- Comparisons with other planar options

**Result:** Can make informed decision with all data points

---

## Implementation Strategy

### Phase 1: Foundation (Current Sprint)
- [x] Document progressive disclosure strategy
- [ ] Implement browse mode selector (guided/explore/advanced)
- [ ] Clean form factor data (open/closed)
- [ ] Add `open_back` boolean field to database

### Phase 2: Filter Visibility (Next Sprint)
- [ ] Implement conditional filter rendering based on mode
- [ ] Add simplified labels for guided mode ("Balanced" vs "Neutral")
- [ ] Show/hide form factor filter based on mode + equipment selection
- [ ] Add tooltips for explore mode (helpful but not intrusive)

### Phase 3: Advanced Filters (Future)
- [ ] Add driver type filter (advanced mode only)
- [ ] Add impedance range filter (advanced mode only)
- [ ] Add detailed Crinacle signature expansion (advanced mode)
- [ ] Add technical measurements display (advanced mode)

### Phase 4: Card Info Progressive Disclosure (Future)
- [ ] Minimal card design for guided mode
- [ ] Balanced card with expandable details for explore mode
- [ ] Full specs card for advanced mode
- [ ] Implement "Show technical specs" expansion

---

## Key Design Principles

### 1. **Never Overwhelm**
- Guided mode: 2 filters (equipment + sound)
- Explore mode: 3-4 filters (+ form factor)
- Advanced mode: 6+ filters (everything)

### 2. **Progressive Learning**
- Users naturally graduate from guided → explore → advanced
- Each level introduces new concepts gradually
- Terminology evolves (Balanced → Neutral → DF-neutral)

### 3. **Contextual Display**
- Form factor only shown when headphones selected
- Driver type only shown in advanced mode
- Technical specs hidden in cards until expanded

### 4. **Escape Hatches**
- Advanced users can always jump to full control mode
- Beginners can explore more filters if curious
- Mode switching is always visible and encouraged

### 5. **Respect User Intelligence**
- Don't condescend (guided mode users aren't stupid)
- Don't gatekeep (anyone can use advanced mode)
- Provide learning resources (tooltips, explanations)

---

## Measuring Success

### Metrics to Track

**Mode adoption:**
- % of users in each mode
- Mode switches per session
- Correlation between mode and purchase decisions

**Filter usage:**
- Which filters are actually used (in each mode)
- Which filters are ignored (candidates for removal)
- Filter combinations that lead to selections

**User satisfaction:**
- Do guided mode users feel confident?
- Do explore mode users find what they need?
- Do advanced mode users appreciate the detail?

---

## Future: AI-Powered Progressive Disclosure

**Concept:** Automatically adjust disclosure based on behavior

**Signals that user is more advanced:**
- Switches to advanced mode multiple times
- Uses technical filters (driver type, impedance)
- Reads detailed specifications
- Searches for specific technical terms
- Compares measurements across components

**Signals that user needs simpler interface:**
- Overwhelmed by options (closes page quickly)
- Doesn't use filters beyond budget
- Random clicking (no clear decision pattern)
- Spends time on "why recommended" explanations

**Adaptive response:**
- Suggest mode switching
- Highlight relevant filters
- Show contextual help
- Gradually introduce new concepts

---

## Conclusion

**Progressive disclosure solves the knowledge gap problem:**
- Beginners aren't overwhelmed by jargon
- Intermediates get useful, practical filters
- Enthusiasts get full technical control

**Form factor (open/closed) fits into this perfectly:**
- Guided: Hidden (algorithm picks appropriate ones)
- Explore: Shown with plain language ("Open-back" + tooltip)
- Advanced: Shown with technical terms ("Open circumaural")

**Driver type follows same pattern:**
- Guided: Hidden completely
- Explore: Mentioned in card details only
- Advanced: Full filter with detailed options

This creates a **self-adjusting interface** that grows with user knowledge, rather than forcing everyone through the same experience.

# DAC/Amp/Combo Card Layout Proposals

## Current Layout (All Components)
```
┌─────────────────────────────────────────────────┐
│ Brand Model                  $200-$300          │
│ Brand Name                                      │
│                                                 │
│ Sound: neutral | Compatibility: 85%            │
└─────────────────────────────────────────────────┘
```
**Problems:**
- "Sound: neutral" is meaningless for 84-86% of DACs/amps
- Missing technical specs that matter (SINAD, power, I/O)
- No differentiation between components

---

## Proposed: DAC Card Layout
```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Best Value                                               │
│ Topping D90SE                                               │
│ Topping                                                     │
│                                       Used Est.: $450-$550  │
│                                            MSRP: $899       │
│                                                             │
│ ⚡ Performance                                              │
│ • SINAD: 122 dB (Excellent) • ASR Score: 95/100           │
│                                                             │
│ 🔌 Connectivity                                             │
│ • Inputs: USB, Optical, Coaxial, AES                       │
│ • Outputs: RCA, XLR (Balanced)                             │
│                                                             │
│ 💡 Why Recommended                                          │
│ Industry-leading measurements, versatile connectivity      │
└─────────────────────────────────────────────────────────────┘
```

**Key Changes:**
- ✅ SINAD measurement with interpretation (Excellent/Good/Fair)
- ✅ ASR score if available
- ✅ Input/output types (critical for compatibility)
- ❌ Removed "Sound: neutral"

---

## Proposed: Amp Card Layout
```
┌─────────────────────────────────────────────────────────────┐
│ 🎵 Best Match                                               │
│ Schiit Magni 3+                                             │
│ Schiit                                                      │
│                                         Used Est.: $75-$100 │
│                                            MSRP: $99        │
│                                                             │
│ ⚡ Power Output                                             │
│ • 2W @ 32Ω | 410mW @ 300Ω                                  │
│ • Power Match: 95% (Perfect for your HD650)                │
│                                                             │
│ 📊 Performance                                              │
│ • SINAD: 105 dB (Very Good)                                │
│                                                             │
│ 🔌 Connectivity                                             │
│ • Inputs: RCA                                               │
│ • Outputs: 6.35mm (1/4"), Preamp Out                       │
│                                                             │
│ 💡 Why Recommended                                          │
│ Plenty of power for high-impedance headphones, clean      │
└─────────────────────────────────────────────────────────────┘
```

**Key Changes:**
- ✅ Power output specs (critical for amps)
- ✅ Power adequacy % with context ("Perfect for your HD650")
- ✅ SINAD measurement
- ✅ Input/output types
- ❌ Removed "Sound: neutral"

---

## Proposed: Combo Unit Card Layout
```
┌─────────────────────────────────────────────────────────────┐
│ 💎 Premium Pick                                             │
│ RME ADI-2 DAC FS                                            │
│ RME                                                         │
│                                       Used Est.: $800-$950  │
│                                            MSRP: $1,099     │
│                                                             │
│ ⚡ Performance                                              │
│ • DAC SINAD: 118 dB (Excellent)                            │
│ • Amp Power: 1.5W @ 32Ω | 210mW @ 300Ω                     │
│                                                             │
│ 🔌 Connectivity                                             │
│ • Inputs: USB, Optical, Coaxial                            │
│ • Outputs: 6.35mm, 4.4mm Balanced, RCA, XLR               │
│                                                             │
│ ✨ Special Features                                         │
│ • Parametric EQ • Remote Control • Display                 │
│                                                             │
│ 💡 Why Recommended                                          │
│ Professional-grade all-in-one solution with extensive     │
│ features and DSP capabilities                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Changes:**
- ✅ Combined DAC + amp specs
- ✅ Special features (EQ, remote, display)
- ✅ Both SINAD and power specs
- ❌ Removed "Sound: neutral"

---

## Headphone Card (For Comparison - Keep As Is)
```
┌─────────────────────────────────────────────────────────────┐
│ 🎵 Best Match                                               │
│ Sennheiser HD 650                                           │
│ Sennheiser                                                  │
│                                       Used Est.: $200-$250  │
│                                            MSRP: $499       │
│                                                             │
│ ⚡ Moderate Power | Sound: warm | 300Ω | Over-ear          │
│                                                             │
│ 🎯 Expert Analysis                                          │
│ • Tone: A+ • Technical: A                                  │
│ • Crinacle: "Warm neutral, great timbre"                   │
│                                                             │
│ 💡 Why Recommended                                          │
│ Legendary midrange, comfortable for long sessions          │
└─────────────────────────────────────────────────────────────┘
```

**Headphones keep sound signature** because it's meaningful for them.

---

## Layout Hierarchy

**All Cards Share:**
1. Badges (🎯 Best Value, 🎵 Best Match, 💎 Premium Pick)
2. Name + Price (right-aligned)
3. Brand + MSRP

**Category-Specific Sections:**

| Section | Headphones | DACs | Amps | Combos |
|---------|-----------|------|------|--------|
| Sound Signature | ✅ | ❌ | ❌ | ❌ |
| Amplification | ✅ | ❌ | ❌ | ❌ |
| Power Output | ❌ | ❌ | ✅ | ✅ |
| Power Match | ❌ | ❌ | ✅ | ✅ |
| SINAD | ❌ | ✅ | ✅ | ✅ |
| Inputs/Outputs | ❌ | ✅ | ✅ | ✅ |
| Special Features | ❌ | ❌ | ❌ | ✅ |
| Expert Analysis | ✅ | ❌ | ❌ | ❌ |

---

## Fallback Behavior (When Data Missing)

**If SINAD is null:**
```
📊 Performance
• ASR Review Available (view details)
```
or hide section entirely

**If power_output is null:**
```
⚡ Power Output
• Specifications not available
```
or hide section entirely

**If input_types/output_types are null:**
```
🔌 Connectivity
• Check manufacturer specs
```
or hide section entirely

---

## Mobile Considerations

On mobile, sections stack vertically:
```
┌───────────────────────────┐
│ Name                      │
│ Brand                     │
│ Used Est.: $200-$250      │
│                       │
│ ⚡ Performance         │
│ • SINAD: 122 dB       │
│                       │
│ 🔌 Connectivity        │
│ • USB, Optical        │
│ • RCA, XLR            │
│                       │
│ 💡 Why Recommended     │
│ Great value...        │
└───────────────────────┘
```

All sections maintain same order but collapse to single column.

# Color Override Reference for HiFinder Recommendations Page

## Quick Start

**To change colors:**
1. Open `/src/styles/color-overrides.css`
2. Find the variable you want to change (e.g., `--rec-card-bg-selected`)
3. Edit the hex value (e.g., `#FFF3E0` → `#FFD4A3`)
4. Save the file
5. Refresh your browser - changes apply instantly!

## Current Color System

### Light Mode vs Dark Mode

Colors are **completely independent** between light and dark modes:

```css
/* Light Mode */
:root {
  --rec-card-bg-selected: #FFF3E0;  /* Light orange */
}

/* Dark Mode */
[data-theme="dark"] {
  --rec-card-bg-selected: #3D2822;  /* Dark brown */
}
```

Changing one mode **does not affect** the other.

---

## Known Issues & Suggested Fixes

### 🔴 Critical Issues

#### 1. Selected Card Background (Light Mode)
- **Variable:** `--rec-card-bg-selected`
- **Current:** `#FFF3E0` (very light cream)
- **Issue:** Too light, barely visible when card is selected
- **Suggested fix:** `#FFE4B5` or `#FFDAB9` (more saturated orange)

#### 2. Selected Card Background (Dark Mode)
- **Variable:** `--rec-card-bg-selected`
- **Current:** `#3D2822` (dark brown)
- **Issue:** Nearly invisible, almost no contrast with card background
- **Suggested fix:** `#7D4822` or `#8B5A2B` (much lighter brown)

#### 3. Secondary Text (Light Mode)
- **Variable:** `--rec-card-text-secondary`
- **Current:** `#495057` (medium gray)
- **Issue:** Can be low contrast on white backgrounds
- **Suggested fix:** `#2D3748` (darker gray for better readability)

#### 4. Secondary Text (Dark Mode)
- **Variable:** `--rec-card-text-secondary`
- **Current:** `#ADB5BD` (light gray)
- **Issue:** Often too dim, hard to read
- **Suggested fix:** `#CBD5E0` or `#E2E8F0` (much lighter)

### 🟡 Moderate Issues

#### 5. Match Score Text
- **Variable:** `--rec-match-score-text`
- **Current (Light):** `#EA580C` (orange)
- **Current (Dark):** `#FDBA74` (lighter orange)
- **Issue:** Can blend with other orange elements in the theme
- **Suggested fix:** Consider using accent color `#E85A4F` for differentiation

---

## Color Categories

### Recommendation Cards

| Element | Light Mode | Dark Mode | Purpose |
|---------|------------|-----------|---------|
| Background | `--rec-card-bg` | `#FFFFFF` → `#13151A` | Default card background |
| Hover BG | `--rec-card-bg-hover` | `#F8F9FA` → `#1C1F26` | Hover state |
| Selected BG | `--rec-card-bg-selected` | `#FFF3E0` → `#3D2822` | ⚠️ Low contrast |
| Border | `--rec-card-border` | `#DEE2E6` → `#2C3038` | Default border |
| Hover Border | `--rec-card-border-hover` | `#E85A4F` (both modes) | Accent on hover |
| Primary Text | `--rec-card-text-primary` | `#212529` → `#F8F9FA` | Headings |
| Secondary Text | `--rec-card-text-secondary` | `#495057` → `#ADB5BD` | ⚠️ Low contrast |
| Tertiary Text | `--rec-card-text-tertiary` | `#6C757D` (both modes) | Least important |

### Champion Badges

| Badge | Variable | Light Mode | Dark Mode | Purpose |
|-------|----------|------------|-----------|---------|
| 🏆 Top Tech | `--rec-badge-technical-bg` | `#E85A4F` | `#FF7043` | Best technical score |
| | `--rec-badge-technical-text` | `#FFFFFF` (both) | | |
| 🎵 Best Match | `--rec-badge-tone-bg` | `#F57C00` | `#FF9800` | Best tone match |
| | `--rec-badge-tone-text` | `#FFFFFF` (both) | | |
| 💰 Value | `--rec-badge-value-bg` | `#FF6B35` | `#FFB366` | Best value rating |
| | `--rec-badge-value-text` | `#FFFFFF` | `#000000` | Dark text for contrast |

### Category Badges

| Category | Variable Prefix | Light BG | Light Text | Dark BG | Dark Text |
|----------|----------------|----------|------------|---------|-----------|
| IEMs | `--rec-category-iem-` | `#FFF3E0` | `#EF6C00` | `rgba(245,158,11,0.15)` | `#FCD34D` |
| Headphones | `--rec-category-cans-` | `#FFE4C4` | `#EA580C` | `rgba(249,115,22,0.15)` | `#FDBA74` |
| DACs | `--rec-category-dac-` | `#E0F2FE` | `#0891B2` | `rgba(6,182,212,0.15)` | `#67E8F9` |
| Amps | `--rec-category-amp-` | `#D1FAE5` | `#059669` | `rgba(16,185,129,0.15)` | `#6EE7B7` |
| Combos | `--rec-category-combo-` | `#DBEAFE` | `#2563EB` | `rgba(59,130,246,0.15)` | `#93C5FD` |

### Filter Buttons

#### Equipment Filters

| Filter | Variable | Light Mode | Dark Mode |
|--------|----------|------------|-----------|
| Headphones | `--rec-filter-headphones` | `#8B5CF6` (purple) | `#A78BFA` (lighter) |
| IEMs | `--rec-filter-iems` | `#6366F1` (indigo) | `#818CF8` |
| DACs | `--rec-filter-dacs` | `#10B981` (green) | `#34D399` |
| Amps | `--rec-filter-amps` | `#F59E0B` (amber) | `#FCD34D` |
| Combos | `--rec-filter-combos` | `#3B82F6` (blue) | `#60A5FA` |

#### Sound Signature Filters

| Filter | Variable | Light Mode | Dark Mode |
|--------|----------|------------|-----------|
| Neutral | `--rec-filter-neutral` | `#6B7280` (gray) | `#9CA3AF` |
| Warm | `--rec-filter-warm` | `#FB923C` (orange) | `#FDBA74` |
| Bright | `--rec-filter-bright` | `#38BDF8` (cyan) | `#7DD3FC` |
| Fun | `--rec-filter-fun` | `#F472B6` (pink) | `#F9A8D4` |

#### Filter States

| State | Variable | Light Mode | Dark Mode |
|-------|----------|------------|-----------|
| Inactive BG | `--rec-filter-bg-inactive` | `#F8F9FA` | `#1C1F26` |
| Active BG Opacity | `--rec-filter-bg-active-opacity` | `0.08` | `0.15` |
| Inactive Border | `--rec-filter-border-inactive` | `#DEE2E6` | `#2C3038` |

### Match Score

| Element | Variable | Light Mode | Dark Mode |
|---------|----------|------------|-----------|
| Match % Text | `--rec-match-score-text` | `#EA580C` | `#FDBA74` |
| Star Icon | `--rec-match-score-star` | `#F59E0B` | `#FCD34D` |

### Amplification Warnings

| Level | Variable | Light Mode | Dark Mode |
|-------|----------|------------|-----------|
| Easy | `--rec-amp-easy-text` | `#059669` (green) | `#6EE7B7` |
| Moderate | `--rec-amp-moderate-text` | `#F59E0B` (amber) | `#FCD34D` |
| Demanding | `--rec-amp-demanding-text` | `#F97316` (orange) | `#FDBA74` |
| Very Demanding | `--rec-amp-very-demanding-text` | `#EF4444` (red) | `#FCA5A5` |
| Warning Banner BG | `--rec-amp-warning-bg` | `#FFF3E0` | `rgba(245,158,11,0.1)` |
| Warning Banner Border | `--rec-amp-warning-border` | `#FFB74D` | `#F59E0B` |

### Browse Mode Selector

**"Show me top picks", "Let me explore", "Full control mode"**

| Element | Variable | Light Mode | Dark Mode |
|---------|----------|------------|-----------|
| Inactive Border | `--browse-mode-border-inactive` | `#DEE2E6` (gray) | `#2C3038` (dark gray) |
| Hover Border | `--browse-mode-border-hover` | `#FCD8AC` (light orange) | `#D97706` (darker orange) |
| Active Border | `--browse-mode-border-active` | `#EA580C` (orange) | `#FB923C` (lighter orange) |
| Inactive BG | `--browse-mode-bg-inactive` | `#FFFFFF` (white) | `#13151A` (dark) |
| Active BG | `--browse-mode-bg-active` | `#FFF7ED` (light orange) | `rgba(251,146,60,0.2)` (orange opacity) |
| Inactive Icon | `--browse-mode-icon-inactive` | `#6C757D` (gray) | `#9CA3AF` (lighter gray) |
| Active Icon | `--browse-mode-icon-active` | `#EA580C` (orange) | `#FB923C` (lighter orange) |
| Inactive Title | `--browse-mode-title-inactive` | `#212529` (dark) | `#F8F9FA` (light) |
| Active Title | `--browse-mode-title-active` | `#7C2D12` (dark orange) | `#FED7AA` (light orange) |
| Description | `--browse-mode-description` | `#6C757D` (gray) | `#ADB5BD` (lighter gray) |
| "Best for:" text | `--browse-mode-bestfor` | `#9CA3AF` (light gray) | `#6C757D` (darker gray) |

---

## Testing Tips

### Contrast Checking

Use browser DevTools or online tools:
- **WebAIM Contrast Checker:** https://webaim.org/resources/contrastchecker/
- **WCAG AA Standard:** Minimum 4.5:1 for normal text, 3:1 for large text
- **WCAG AAA Standard:** 7:1 for normal text, 4.5:1 for large text (recommended)

### Testing Workflow

1. **Open recommendations page** in browser
2. **Edit `color-overrides.css`** with new value
3. **Save file** (Next.js hot reload activates)
4. **Refresh browser** to see changes
5. **Test both light and dark modes** with theme toggle
6. **Check multiple cards** - selected, hover, default states

### Common Adjustments

**Make a color lighter:**
- Increase the hex values (toward `#FFFFFF`)
- Example: `#495057` → `#6C757D` → `#9CA3AF` (lighter grays)

**Make a color darker:**
- Decrease the hex values (toward `#000000`)
- Example: `#F8F9FA` → `#E9ECEF` → `#CED4DA` (darker grays)

**Increase saturation:**
- Move away from gray tones toward pure hues
- Example: `#ADB5BD` (gray) → `#93C5FD` (blue-tinted)

**Reduce saturation (more muted):**
- Mix with gray tones
- Example: `#3B82F6` (bright blue) → `#60A5FA` (softer blue)

---

## Future Enhancements

**Phase 2:** Component-specific color mapping in HeadphoneCard.tsx
**Phase 3:** Visual color picker tool
**Phase 4:** Storybook integration for interactive component playground

---

## Quick Reference: Hex Color Picker

**Popular Color Tools:**
- https://htmlcolors.com/ - Simple hex picker with names
- https://coolors.co/ - Palette generator
- https://color.adobe.com/ - Adobe Color Wheel
- https://paletton.com/ - Advanced color scheme designer

**Browser DevTools:**
1. Right-click any colored element
2. "Inspect Element"
3. Click the color swatch in CSS panel
4. Use built-in color picker to adjust
5. Copy hex value to `color-overrides.css`

# Brand Name Correction Required

## Component ID: fd8daf38-e882-4ee4-a861-f82a2b6a463b

### Current Database Entry
```
Brand: Symphonium
Name: HarmonicDyne Helios
Category: cans
```

### Issue
The brand and name are reversed/confused. There are TWO different products:

1. **HarmonicDyne Helios** - $150 over-ear headphone
   - Correct Brand: HarmonicDyne
   - Correct Name: Helios
   - Type: 50mm dynamic driver, open-back headphone
   - Specs: 16Ω impedance, walnut wood/steel construction, 360g weight

2. **Symphonium Helios** - $1,100 IEM
   - Correct Brand: Symphonium Audio
   - Correct Name: Helios
   - Type: 4BA driver IEM
   - Specs: Quad balanced armature, aluminum alloy shell

### Current Database State
Based on the technical specifications in the database and my research:
- Driver data matches HarmonicDyne Helios (50mm dynamic, over-ear)
- Category is correct (cans)
- **But the brand field says "Symphonium"**

### Recommended Correction

**Option 1: This is HarmonicDyne Helios (Most Likely)**
```sql
UPDATE components
SET brand = 'HarmonicDyne', name = 'Helios'
WHERE id = 'fd8daf38-e882-4ee4-a861-f82a2b6a463b';
```

**Option 2: This is Symphonium Helios (Less Likely)**
```sql
UPDATE components
SET brand = 'Symphonium Audio', name = 'Helios', category = 'iems'
WHERE id = 'fd8daf38-e882-4ee4-a861-f82a2b6a463b';
-- Would also need to update driver specs, impedance, etc.
```

### Verification Needed
Check the original data source to determine which product this entry was intended to represent. Given that:
- It's categorized as "cans" (correct for HarmonicDyne, wrong for Symphonium)
- The fit data and driver type align with HarmonicDyne
- The technical specifications I found match HarmonicDyne

**Recommendation: Apply Option 1 (Change brand to "HarmonicDyne")**

### Impact
This correction will:
- Fix brand name inconsistency
- Improve search accuracy
- Prevent user confusion between two different products
- Maintain data integrity

### Note
If you want BOTH products in the database:
1. Correct this entry to HarmonicDyne Helios (cans)
2. Add a separate entry for Symphonium Helios (iems) with its own specifications

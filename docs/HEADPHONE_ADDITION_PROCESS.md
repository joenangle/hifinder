# Adding New Headphones to HiFinder Database

## Overview
This guide documents the process for adding new headphones to the HiFinder database, including research, data validation, and script creation.

## Step-by-Step Process

### 1. Research Phase
Gather comprehensive information about the headphone:

**Required Information:**
- Brand and model name
- MSRP (manufacturer's suggested retail price)
- Used market price range (min/max)
- Technical specifications (impedance, sensitivity)
- Driver configuration and type
- Sound signature characteristics
- Use case recommendations

**Research Sources:**
- Manufacturer websites
- Audio review sites (ASR, Crinacle, Head-Fi)
- Community forums (Reddit r/headphones, r/AVexchange)
- Retailer listings (Amazon, B&H, Audio46)
- Used market data (eBay sold listings, AVexchange history)

### 2. Data Validation
Ensure all data matches database schema requirements:

**Database Schema Requirements:**
- `category`: Must be one of: 'cans', 'iems', 'dac', 'amp', 'dac_amp', 'cable'
- `budget_tier`: Must be one of: 'entry', 'mid', 'high'
- `sound_signature`: Must be one of: 'warm', 'neutral', 'bright', 'fun'
- `impedance`: Integer value only (round decimals)
- `needs_amp`: Boolean based on impedance and sensitivity
- `use_cases`: Array of strings

**Price Tier Guidelines:**
- Entry: $20-300
- Mid: $300-800  
- High: $800+

**Sound Signature Guidelines:**
- Warm: Elevated bass, recessed treble
- Neutral: Balanced frequency response
- Bright: Elevated treble, clear highs
- Fun: V-shaped or colored signature

### 3. Script Creation
Create a dedicated script file for each headphone addition:

```javascript
// scripts/add-[brand]-[model].js
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const headphoneData = {
  name: 'Model Name',
  brand: 'Brand Name',
  category: 'cans', // or 'iems'
  price_new: 500,
  price_used_min: 350,
  price_used_max: 450,
  budget_tier: 'mid',
  sound_signature: 'neutral',
  use_cases: ['music', 'gaming'],
  impedance: 32, // Integer only
  needs_amp: false,
  amazon_url: null, // Or valid URL
  why_recommended: 'Detailed explanation of strengths and characteristics...'
}

async function addHeadphone() {
  console.log(`🎧 Adding ${headphoneData.brand} ${headphoneData.name} to database...`)
  
  try {
    // Check if already exists
    const { data: existing, error: checkError } = await supabase
      .from('components')
      .select('id')
      .eq('brand', headphoneData.brand)
      .eq('name', headphoneData.name)
      .eq('category', headphoneData.category)
    
    if (checkError) {
      console.error('Error checking existing:', checkError)
      return
    }
    
    if (existing && existing.length > 0) {
      console.log(`⚠️  ${headphoneData.brand} ${headphoneData.name} already exists`)
      return
    }
    
    // Insert new component
    const { data, error } = await supabase
      .from('components')
      .insert([headphoneData])
      .select()
    
    if (error) {
      console.error('❌ Error inserting:', error)
      return
    }
    
    if (data && data.length > 0) {
      console.log('✅ Successfully added!')
      console.log(`   ID: ${data[0].id}`)
      console.log(`   Name: ${data[0].brand} ${data[0].name}`)
      console.log(`   Category: ${data[0].category}`)
      console.log(`   Price: $${data[0].price_new} MSRP, $${data[0].price_used_min}-${data[0].price_used_max} used`)
    }
    
  } catch (err) {
    console.error('❌ Failed:', err.message)
  }
}

if (require.main === module) {
  addHeadphone()
}

module.exports = { addHeadphone }
```

### 4. Execution
Run the script with environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/add-[brand]-[model].js
```

### 5. Verification
After successful addition:
- Check the database entry
- Test in the onboarding flow
- Verify recommendations include the new headphone

## Common Issues and Solutions

### Impedance Field Error
**Issue:** `invalid input syntax for type integer`
**Solution:** Round decimal impedance values to integers

### Category Mismatch
**Issue:** Invalid category value
**Solution:** Use only: 'cans' (headphones), 'iems' (in-ear monitors)

### Price Tier Misalignment  
**Issue:** Budget tier doesn't match actual pricing
**Solution:** Verify tier ranges: entry ($20-300), mid ($300-800), high ($800+)

### Amazon URL Issues
**Issue:** Invalid or missing Amazon links
**Solution:** Set to `null` if no valid Amazon listing exists

## Future Automation Opportunities

1. **Web Scraping Integration**: Automate data gathering from review sites
2. **Price Monitoring**: Regular updates of used market pricing
3. **Batch Processing**: Handle multiple headphones in single script
4. **Validation Pipeline**: Automated schema validation before insertion
5. **User Submission Interface**: Allow users to suggest missing headphones

## Example: Moondrop Variations Addition

The Moondrop Variations IEM was successfully added using this process:

- **Research**: Gathered from Moondrop website, Crinacle reviews, Reddit discussions
- **Key Data**: $520 MSRP, 15.2Ω impedance (rounded to 15), tribrid driver design
- **Classification**: Mid-tier, fun sound signature, music/gaming use cases
- **Result**: Successfully added as ID `0835b769-4175-4596-88c9-f429e43fbce6`
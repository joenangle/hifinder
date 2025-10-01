# ASR Review Crawler

Agent-based system for extracting component data from Audio Science Review forum threads.

## Architecture

Unlike traditional web scrapers that parse HTML structure, this system uses **AI agents** to read review content like a human would and extract structured data.

### Why Agents Instead of Scraping?

ASR reviews present several challenges:
- Measurements shown in Tableau dashboards (JavaScript-rendered)
- Data embedded in narrative text, not tables
- Specifications scattered throughout posts
- Review format varies by author and date
- Key measurements often in images/graphs

**Solution**: Use Claude agents that can:
- Read and understand natural language
- Extract measurements from context
- Handle varied formats
- Parse specifications intelligently

## Components

### 1. Main Orchestrator (`index.js`)
- Manages the crawling workflow
- Handles concurrency and rate limiting
- Coordinates agent tasks
- Imports data to database

### 2. Review Parser Agent (`parse-review-agent.js`)
- Launches Claude agent for each review URL
- Extracts structured data from review text
- Returns JSON with component specifications

### 3. Review URLs List (`review-urls.txt`)
- Curated list of ASR review URLs
- Organized by category
- ~30 high-quality reviews to start

## Usage

### Dry Run (Preview Only)
```bash
node scripts/asr-crawler/index.js --dry-run
```

Shows what would be imported without modifying the database.

### Execute Import
```bash
# Requires environment variables:
# NEXT_PUBLIC_SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY

node scripts/asr-crawler/index.js --execute
```

### Crawl Specific URLs
```bash
node scripts/asr-crawler/index.js --dry-run --urls=review-urls.txt
```

### Filter by Category
```bash
node scripts/asr-crawler/index.js --dry-run --category=dac
```

## Data Extraction

For each review, the agent extracts:

| Field | Description | Required |
|-------|-------------|----------|
| `brand` | Manufacturer (e.g., "Topping") | ✅ |
| `name` | Model name (e.g., "D90") | ✅ |
| `category` | dac, amp, dac_amp, headphones, iems | ✅ |
| `asr_sinad` | SINAD measurement in dB | ✅ |
| `price_new` | MSRP in USD | ⚪ |
| `power_output` | Power specs for amps (e.g., "2W @ 32Ω") | ⚪ |
| `asr_review_url` | Link to review thread | ✅ |

## Database Import Strategy

### Non-Destructive Updates

The system follows these rules when importing:

#### ALWAYS UPDATE
- `asr_sinad` - ASR is authoritative for measurements
- `asr_review_url` - Direct link to source

#### FILL IF MISSING
- `price_new` - Only if null in database
- `brand`, `name` - Only if null

#### NEVER OVERWRITE
- `crinacle_sound_signature` - Expert data is preserved
- `tone_grade`, `technical_grade` - Manual ratings
- Any field with `source != 'asr_crawler'`

#### INTELLIGENT MERGE
- If component exists: Update only ASR-specific fields
- If SINAD is lower: Skip update
- If brand/name mismatch: Flag for manual review

### Duplicate Detection

Uses fuzzy matching (Levenshtein distance) to detect:
- Exact matches: UPDATE existing record
- Close matches (≥0.9 similarity): FLAG for review
- No match: INSERT new component

## Output

### Console Output
```
🎵 ASR Review Crawler Starting...

📋 Configuration:
   Mode: DRY RUN (preview only)
   Category filter: all
   Max concurrent: 3

🔍 Step 1: Discovering review URLs...
   Found 27 review URLs to process

📖 Step 2: Parsing reviews with AI agents...
   Processing: https://www.audiosciencereview.com/...
   ✓ Extracted: Topping D90
   ...
   Extracted 27 components

👀 Step 3: Preview (dry run mode)...

   Topping D90
     Category: dac
     SINAD: 123 dB
     Price: $699
     Review: https://...

   Total: 27 components ready to import
   Run with --execute to import to database

✅ Crawler complete!
```

### Import Summary (--execute mode)
```
📊 Import Summary:
   Inserted: 15 new components
   Updated: 8 existing components
   Skipped: 4 (no new data)
```

## Adding More Reviews

To expand coverage:

1. **Add URLs to `review-urls.txt`**:
   ```
   # New high-end DACs
   https://www.audiosciencereview.com/forum/...
   ```

2. **Or discover automatically** (future enhancement):
   ```bash
   node scripts/asr-crawler/discover-reviews.js --category=dac --min-sinad=120
   ```

## Future Enhancements

### Phase 2: Automated Discovery
- Crawl ASR index pages to find review URLs
- Filter by SINAD threshold
- Sort by date (newest first)

### Phase 3: Advanced Parsing
- Extract frequency response data
- Parse dynamic range measurements
- Capture reviewer recommendations

### Phase 4: Monitoring
- Detect new ASR reviews automatically
- Email/Slack notifications
- Weekly import cron job

## Troubleshooting

### Agent Returns No Data
- Review may not contain SINAD measurement
- Check review URL is valid
- Try manually reading the review to verify data exists

### Duplicate Components
- Check for typos in brand/model names
- Review fuzzy matching threshold
- Manually merge duplicates in database

### Rate Limiting
- Adjust `maxConcurrent` in config
- Add delays between requests
- Use `--urls` flag for small batches

## Related Files

- **Archived**: `scripts/archive/scrape-asr-amps-hardcoded-2025-10-01.js` (old hardcoded approach)
- **Database**: `components` table in Supabase
- **Schema**: Field definitions in main app

## License

Part of the HiFinder project.

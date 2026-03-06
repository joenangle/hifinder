/**
 * Location normalization for used listings.
 * Parses freeform location text into structured state/country fields.
 */

export interface NormalizedLocation {
  state: string | null   // US state or Canadian province code (e.g., "CA", "ON")
  country: string | null // ISO 3166-1 alpha-2 (e.g., "US", "CA", "GB")
}

// US state codes
const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC'
])

// Canadian province codes
const CA_PROVINCES = new Set([
  'AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'
])

// Country name → ISO code mapping for common entries
const COUNTRY_MAP: Record<string, string> = {
  'uk': 'GB', 'united kingdom': 'GB', 'england': 'GB', 'scotland': 'GB', 'wales': 'GB',
  'germany': 'DE', 'de': 'DE',
  'france': 'FR', 'fr': 'FR',
  'italy': 'IT', 'it': 'IT',
  'spain': 'ES', 'es': 'ES',
  'netherlands': 'NL', 'nl': 'NL',
  'portugal': 'PT', 'pt': 'PT',
  'sweden': 'SE', 'se': 'SE',
  'norway': 'NO', 'no': 'NO',
  'denmark': 'DK', 'dk': 'DK',
  'finland': 'FI', 'fi': 'FI',
  'poland': 'PL', 'pl': 'PL',
  'austria': 'AT', 'at': 'AT',
  'switzerland': 'CH', 'ch': 'CH',
  'belgium': 'BE', 'be': 'BE',
  'ireland': 'IE', 'ie': 'IE',
  'japan': 'JP', 'jp': 'JP',
  'australia': 'AU', 'au': 'AU',
  'singapore': 'SG', 'sg': 'SG',
  'south korea': 'KR', 'korea': 'KR', 'kr': 'KR',
  'china': 'CN', 'cn': 'CN',
  'hong kong': 'HK', 'hk': 'HK',
  'taiwan': 'TW', 'tw': 'TW',
  'india': 'IN',
  'mexico': 'MX', 'mx': 'MX',
  'brazil': 'BR', 'br': 'BR',
  'usa': 'US', 'united states': 'US',
  'canada': 'CA',
}

/**
 * Normalize a freeform location string into structured state/country.
 *
 * Handles formats from all sources:
 * - Reddit: "US-CA", "CA-BC", "EU-PT", "GB-NG", "UA-UA"
 * - Reverb: "CA, US" (region, country_code) or "Unknown"
 * - Generic: "CONUS", "USA", country names
 */
export function normalizeLocation(locationText: string | null | undefined, source?: string): NormalizedLocation {
  const result: NormalizedLocation = { state: null, country: null }

  if (!locationText || locationText === 'Unknown') {
    return result
  }

  const text = locationText.trim()

  // Skip known bad values
  if (text === 'Reverb' || text === 'eBay' || text === 'Head-Fi') {
    return result
  }

  // Reddit format: "US-CA", "USA-CA", "CA-BC", "EU-PT"
  const usaLongMatch = text.match(/^USA-([A-Z]{2,3})$/)
  if (usaLongMatch) {
    const state = usaLongMatch[1]
    if (US_STATES.has(state)) return { state, country: 'US' }
    // USA-PGH etc — just country US
    return { state: null, country: 'US' }
  }

  const redditMatch = text.match(/^([A-Z]{2})-([A-Z]{2})$/)
  if (redditMatch) {
    const [, prefix, code] = redditMatch
    if (prefix === 'US' && US_STATES.has(code)) {
      return { state: code, country: 'US' }
    }
    if (prefix === 'CA' && CA_PROVINCES.has(code)) {
      return { state: code, country: 'CA' }
    }
    if (prefix === 'EU') {
      // EU-PT → country PT
      const countryCode = code.toUpperCase()
      return { state: null, country: COUNTRY_MAP[countryCode.toLowerCase()] || countryCode }
    }
    if (prefix === 'GB') {
      // GB-NG → country GB, state code as-is
      return { state: code, country: 'GB' }
    }
    if (prefix === 'UA') {
      return { state: code !== 'UA' ? code : null, country: 'UA' }
    }
    // Other XX-YY: treat first as country
    return { state: code, country: prefix }
  }

  // Reverb format: "CA, US" or "New York, US"
  const reverbMatch = text.match(/^(.+),\s*([A-Z]{2})$/)
  if (reverbMatch) {
    const [, region, countryCode] = reverbMatch
    const regionUpper = region.trim().toUpperCase()
    if (countryCode === 'US' && US_STATES.has(regionUpper)) {
      return { state: regionUpper, country: 'US' }
    }
    if (countryCode === 'CA' && CA_PROVINCES.has(regionUpper)) {
      return { state: regionUpper, country: 'CA' }
    }
    // Region might be a city name or full state name — just keep country
    return { state: null, country: countryCode }
  }

  // CONUS
  if (text.toUpperCase() === 'CONUS') {
    return { state: null, country: 'US' }
  }

  // Plain US state code (standalone, 2 chars)
  if (text.length === 2) {
    const upper = text.toUpperCase()
    if (US_STATES.has(upper)) return { state: upper, country: 'US' }
    if (CA_PROVINCES.has(upper)) return { state: upper, country: 'CA' }
    // Could be a country code
    const mapped = COUNTRY_MAP[text.toLowerCase()]
    if (mapped) return { state: null, country: mapped }
    return { state: null, country: upper }
  }

  // Country name lookup
  const lower = text.toLowerCase()
  const mappedCountry = COUNTRY_MAP[lower]
  if (mappedCountry) {
    return { state: null, country: mappedCountry }
  }

  // Try partial country name matches for longer strings
  for (const [name, code] of Object.entries(COUNTRY_MAP)) {
    if (name.length > 2 && lower.includes(name)) {
      return { state: null, country: code }
    }
  }

  return result
}

// US states list for the filter UI
export const US_STATES_LIST = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
]

// Countries with listings (for filter UI)
export const COUNTRIES_LIST = [
  { code: 'US', name: 'United States' }, { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' }, { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japan' }, { code: 'KR', name: 'South Korea' },
  { code: 'SG', name: 'Singapore' }, { code: 'HK', name: 'Hong Kong' },
  { code: 'NL', name: 'Netherlands' }, { code: 'SE', name: 'Sweden' },
  { code: 'IT', name: 'Italy' }, { code: 'ES', name: 'Spain' },
  { code: 'PT', name: 'Portugal' }, { code: 'UA', name: 'Ukraine' },
]

/**
 * Location normalizer (CJS) — shared between scrapers and backfill script.
 * Mirrors src/lib/location-normalizer.ts for use in Node scripts.
 */

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC'
])

const CA_PROVINCES = new Set([
  'AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'
])

const COUNTRY_MAP = {
  'uk': 'GB', 'united kingdom': 'GB', 'england': 'GB',
  'germany': 'DE', 'de': 'DE', 'france': 'FR', 'fr': 'FR',
  'italy': 'IT', 'spain': 'ES', 'portugal': 'PT', 'pt': 'PT',
  'netherlands': 'NL', 'sweden': 'SE', 'norway': 'NO',
  'denmark': 'DK', 'finland': 'FI', 'poland': 'PL',
  'austria': 'AT', 'switzerland': 'CH', 'belgium': 'BE',
  'ireland': 'IE', 'japan': 'JP', 'jp': 'JP',
  'australia': 'AU', 'au': 'AU', 'singapore': 'SG', 'sg': 'SG',
  'south korea': 'KR', 'korea': 'KR', 'china': 'CN',
  'hong kong': 'HK', 'taiwan': 'TW', 'india': 'IN',
  'mexico': 'MX', 'brazil': 'BR',
  'usa': 'US', 'united states': 'US', 'canada': 'CA',
}

function normalizeLocation(locationText) {
  const result = { state: null, country: null }
  if (!locationText || locationText === 'Unknown') return result

  const text = locationText.trim()
  if (text === 'Reverb' || text === 'eBay' || text === 'Head-Fi') return result

  // USA-CA, USA-TX format
  const usaLongMatch = text.match(/^USA-([A-Z]{2,3})$/)
  if (usaLongMatch) {
    const state = usaLongMatch[1]
    if (US_STATES.has(state)) return { state, country: 'US' }
    return { state: null, country: 'US' }
  }

  // US-CA, CA-BC, EU-PT format
  const redditMatch = text.match(/^([A-Z]{2})-([A-Z]{2})$/)
  if (redditMatch) {
    const [, prefix, code] = redditMatch
    if (prefix === 'US' && US_STATES.has(code)) return { state: code, country: 'US' }
    if (prefix === 'CA' && CA_PROVINCES.has(code)) return { state: code, country: 'CA' }
    if (prefix === 'EU') return { state: null, country: COUNTRY_MAP[code.toLowerCase()] || code }
    if (prefix === 'GB') return { state: code, country: 'GB' }
    if (prefix === 'UA') return { state: code !== 'UA' ? code : null, country: 'UA' }
    return { state: code, country: prefix }
  }

  // Reverb format: "CA, US"
  const reverbMatch = text.match(/^(.+),\s*([A-Z]{2})$/)
  if (reverbMatch) {
    const [, region, countryCode] = reverbMatch
    const regionUpper = region.trim().toUpperCase()
    if (countryCode === 'US' && US_STATES.has(regionUpper)) return { state: regionUpper, country: 'US' }
    if (countryCode === 'CA' && CA_PROVINCES.has(regionUpper)) return { state: regionUpper, country: 'CA' }
    return { state: null, country: countryCode }
  }

  if (text.toUpperCase() === 'CONUS') return { state: null, country: 'US' }

  if (text.length === 2) {
    const upper = text.toUpperCase()
    if (US_STATES.has(upper)) return { state: upper, country: 'US' }
    if (CA_PROVINCES.has(upper)) return { state: upper, country: 'CA' }
    const mapped = COUNTRY_MAP[text.toLowerCase()]
    if (mapped) return { state: null, country: mapped }
    return { state: null, country: upper }
  }

  const lower = text.toLowerCase()
  const mappedCountry = COUNTRY_MAP[lower]
  if (mappedCountry) return { state: null, country: mappedCountry }

  for (const [name, code] of Object.entries(COUNTRY_MAP)) {
    if (name.length > 2 && lower.includes(name)) return { state: null, country: code }
  }

  return result
}

module.exports = { normalizeLocation, US_STATES, CA_PROVINCES }

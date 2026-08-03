/**
 * Pure helpers for bulk CSV gear import on /gear.
 *
 * Parses a collection CSV (the format /gear exports), matches each row to a
 * catalog component, and shapes a user_gear insert payload. Kept pure so the
 * parsing/matching/mapping is unit-tested without a DB or the browser.
 */

export interface ParsedGearRow {
  brand: string
  model: string
  category: string
  purchaseDate: string
  pricePaid: string
  condition: string
  location: string
  notes: string
}

// Header aliases → canonical field. Lets us accept the app's own export plus
// lightly-edited spreadsheets from elsewhere.
const HEADER_ALIASES: Record<string, keyof ParsedGearRow> = {
  brand: 'brand',
  model: 'model',
  name: 'model',
  category: 'category',
  type: 'category',
  'purchase date': 'purchaseDate',
  date: 'purchaseDate',
  'price paid': 'pricePaid',
  price: 'pricePaid',
  'price paid ($)': 'pricePaid',
  condition: 'condition',
  location: 'location',
  notes: 'notes',
  note: 'notes',
}

/** Splits one CSV line into fields, honoring double-quoted values + "" escapes. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields.map((f) => f.trim())
}

export function parseGearCsv(text: string): { rows: ParsedGearRow[]; errors: string[] } {
  const errors: string[] = []
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)

  if (lines.length === 0) {
    return { rows: [], errors: ['The file is empty.'] }
  }

  const headerCells = splitCsvLine(lines[0]).map((h) => h.toLowerCase())
  const colToField: (keyof ParsedGearRow | null)[] = headerCells.map(
    (h) => HEADER_ALIASES[h] ?? null
  )

  if (!colToField.includes('brand') || !colToField.includes('model')) {
    return {
      rows: [],
      errors: ['CSV must include "Brand" and "Model" (or "Name") columns.'],
    }
  }

  const rows: ParsedGearRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    const row: ParsedGearRow = {
      brand: '',
      model: '',
      category: '',
      purchaseDate: '',
      pricePaid: '',
      condition: '',
      location: '',
      notes: '',
    }
    colToField.forEach((field, idx) => {
      if (field) row[field] = cells[idx] ?? ''
    })
    if (!row.brand && !row.model) {
      errors.push(`Row ${i + 1}: missing brand and model — skipped.`)
      continue
    }
    rows.push(row)
  }

  return { rows, errors }
}

export function normalizeGearKey(brand: string, model: string): string {
  // Strip ALL separators (spaces, hyphens, punctuation) so audio naming chaos
  // collapses: "HD 600" == "HD-600" == "HD600".
  return `${brand} ${model}`.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export interface ComponentIndexEntry {
  id: string
  brand: string
  name: string
}

export function buildComponentIndex(components: ComponentIndexEntry[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const c of components) {
    index.set(normalizeGearKey(c.brand, c.name), c.id)
  }
  return index
}

export interface GearMatch {
  matched: boolean
  component_id?: string
}

export function matchGearRow(row: ParsedGearRow, index: Map<string, string>): GearMatch {
  const id = index.get(normalizeGearKey(row.brand, row.model))
  return id ? { matched: true, component_id: id } : { matched: false }
}

export interface GearInsert {
  component_id?: string
  custom_brand?: string
  custom_name?: string
  custom_category?: string
  condition?: string
  purchase_date?: string
  purchase_price?: number
  purchase_location?: string
  notes?: string
}

function parsePrice(raw: string): number | undefined {
  if (!raw) return undefined
  const n = parseFloat(raw.replace(/[^0-9.]/g, ''))
  return Number.isNaN(n) ? undefined : n
}

export function buildGearInsert(row: ParsedGearRow, match: GearMatch): GearInsert {
  const insert: GearInsert = {}

  if (match.matched && match.component_id) {
    insert.component_id = match.component_id
  } else {
    if (row.brand) insert.custom_brand = row.brand
    if (row.model) insert.custom_name = row.model
    if (row.category) insert.custom_category = row.category
  }

  if (row.condition) insert.condition = row.condition.trim().toLowerCase()
  if (row.purchaseDate) insert.purchase_date = row.purchaseDate
  const price = parsePrice(row.pricePaid)
  if (price !== undefined) insert.purchase_price = price
  if (row.location) insert.purchase_location = row.location
  if (row.notes) insert.notes = row.notes

  return insert
}

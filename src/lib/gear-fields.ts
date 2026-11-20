/**
 * Columns a user may set on their own user_gear rows, from the gear page's add
 * and edit forms and the CSV import (src/lib/gear-import.ts).
 *
 * Everything else is server-owned: id, user_id, is_active, is_loaned,
 * loaned_to, loaned_date, current_value, created_at, updated_at. This matters
 * because /api/gear writes through the service-role client, which bypasses
 * RLS. Without an allowlist, a PUT body could set user_id and move a row into
 * another user's collection.
 */
export const WRITABLE_GEAR_FIELDS = [
  'component_id',
  'purchase_date',
  'purchase_price',
  'purchase_location',
  'condition',
  'serial_number',
  'notes',
  'custom_name',
  'custom_brand',
  'custom_category',
] as const

export type WritableGearField = (typeof WRITABLE_GEAR_FIELDS)[number]
export type GearFields = Partial<Record<WritableGearField, unknown>>

/**
 * Copy only the writable fields out of an untrusted request body.
 * Used by POST /api/gear, PUT /api/gear?id= and PUT /api/gear/[id].
 */
export function pickGearFields(body: unknown): GearFields {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return {}
  const source = body as Record<string, unknown>
  const picked: GearFields = {}
  for (const key of WRITABLE_GEAR_FIELDS) {
    // Own keys only; undefined is skipped, null is kept (it clears a field).
    if (Object.hasOwn(source, key) && source[key] !== undefined) picked[key] = source[key]
  }
  return picked
}

'use client'

import { useState } from 'react'
import { X, Upload, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  parseGearCsv,
  buildComponentIndex,
  matchGearRow,
  buildGearInsert,
  type ParsedGearRow,
  type GearInsert,
} from '@/lib/gear-import'

interface PreviewRow {
  row: ParsedGearRow
  insert: GearInsert
  matched: boolean
}

interface GearImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImported: () => void
}

export function GearImportModal({ isOpen, onClose, onImported }: GearImportModalProps) {
  const [stage, setStage] = useState<'select' | 'preview' | 'importing' | 'done'>('select')
  const [previews, setPreviews] = useState<PreviewRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [result, setResult] = useState<{ ok: number; failed: number }>({ ok: 0, failed: 0 })
  const [progress, setProgress] = useState(0)

  if (!isOpen) return null

  const matchedCount = previews.filter((p) => p.matched).length
  const customCount = previews.length - matchedCount

  function reset() {
    setStage('select')
    setPreviews([])
    setErrors([])
    setResult({ ok: 0, failed: 0 })
    setProgress(0)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const { rows, errors: parseErrors } = parseGearCsv(text)
    setErrors(parseErrors)

    if (rows.length === 0) {
      setPreviews([])
      setStage('preview')
      return
    }

    // Build a catalog index to match rows to components (711 rows, tiny payload).
    const { data: components } = await supabase.from('components').select('id, brand, name')
    const index = buildComponentIndex(components ?? [])

    setPreviews(
      rows.map((row) => {
        const match = matchGearRow(row, index)
        return { row, insert: buildGearInsert(row, match), matched: match.matched }
      })
    )
    setStage('preview')
  }

  async function handleImport() {
    setStage('importing')
    let ok = 0
    let failed = 0

    // Batch to avoid hammering the API with hundreds of concurrent requests.
    const BATCH = 8
    for (let i = 0; i < previews.length; i += BATCH) {
      const batch = previews.slice(i, i + BATCH)
      const results = await Promise.allSettled(
        batch.map((p) =>
          fetch('/api/gear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(p.insert),
          }).then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
          })
        )
      )
      for (const r of results) r.status === 'fulfilled' ? ok++ : failed++
      setProgress(Math.min(i + BATCH, previews.length))
    }

    setResult({ ok, failed })
    setStage('done')
    onImported()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-elevated rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Import Collection from CSV</h2>
          <button onClick={handleClose} className="text-muted hover:text-foreground" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {stage === 'select' && (
            <div>
              <p className="text-muted mb-4">
                Upload a CSV with columns <strong>Brand, Model, Category, Purchase Date, Price
                Paid, Condition, Location, Notes</strong>. Items are matched to the catalog when
                possible; unmatched rows are added as custom entries. This is the same format the
                Export button produces.
              </p>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-10 cursor-pointer hover:border-accent transition-colors">
                <Upload className="w-8 h-8 text-muted" />
                <span className="text-sm text-foreground font-medium">Choose a CSV file</span>
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
              </label>
            </div>
          )}

          {stage === 'preview' && (
            <div>
              {errors.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-sm flex gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    {errors.slice(0, 5).map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                  </div>
                </div>
              )}

              {previews.length === 0 ? (
                <p className="text-muted">No importable rows found in this file.</p>
              ) : (
                <>
                  <p className="text-foreground mb-3">
                    <strong>{previews.length}</strong> item{previews.length === 1 ? '' : 's'} ready —{' '}
                    <span className="text-accent">{matchedCount} matched to catalog</span>,{' '}
                    {customCount} custom.
                  </p>
                  <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto mb-4">
                    {previews.map((p, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span className="text-foreground truncate">
                          {p.row.brand} {p.row.model}
                          {p.row.pricePaid ? (
                            <span className="text-muted"> · {p.row.pricePaid}</span>
                          ) : null}
                        </span>
                        <span
                          className={`flex-shrink-0 px-2 py-0.5 rounded text-xs ${
                            p.matched
                              ? 'bg-accent/10 text-accent'
                              : 'bg-surface-secondary text-muted'
                          }`}
                        >
                          {p.matched ? 'Catalog' : 'Custom'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={reset} className="button button-secondary flex-1">
                      Choose a different file
                    </button>
                    <button onClick={handleImport} className="button button-primary flex-1">
                      Import {previews.length} item{previews.length === 1 ? '' : 's'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {stage === 'importing' && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-3" />
              <p className="text-foreground">
                Importing… {progress}/{previews.length}
              </p>
            </div>
          )}

          {stage === 'done' && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-foreground font-semibold mb-1">
                Added {result.ok} item{result.ok === 1 ? '' : 's'} to your collection
              </p>
              {result.failed > 0 && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-3">
                  {result.failed} row{result.failed === 1 ? '' : 's'} failed to import.
                </p>
              )}
              <button onClick={handleClose} className="button button-primary mt-2">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

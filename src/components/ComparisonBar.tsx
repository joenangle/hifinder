'use client'

interface ComparisonItem {
  id: string
  brand: string
  name: string
  category: string
  price_used_min?: number | null
  price_used_max?: number | null
  crin_tone?: string | null
  crin_tech?: string | null
  crin_rank?: number | null
  matchScore?: number
  sound_signature?: 'neutral' | 'warm' | 'bright' | 'fun' | null
}

interface ComparisonBarProps {
  items: ComparisonItem[]
  isExpanded: boolean
  onToggleExpand: () => void
  onViewFullComparison: () => void
  onClearAll: () => void
  onClose?: () => void
}

// Helper to get grade color (reused from ExpertAnalysisPanel pattern)
function getGradeColor(grade: string): string {
  const firstChar = grade.charAt(0).toUpperCase()
  if (firstChar === 'S') return 'text-yellow-600 dark:text-yellow-400'
  if (firstChar === 'A') return 'text-green-600 dark:text-green-400'
  if (firstChar === 'B') return 'text-blue-600 dark:text-blue-400'
  if (firstChar === 'C') return 'text-orange-600 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
}

// Helper to format price range
function formatPrice(min?: number | null, max?: number | null): string {
  if (!min && !max) return 'N/A'
  if (min && max) return `$${Math.round(min)}-$${Math.round(max)}`
  return `$${Math.round(min || max || 0)}`
}

export function ComparisonBar({
  items,
  isExpanded,
  onToggleExpand,
  onViewFullComparison,
  onClearAll,
  onClose
}: ComparisonBarProps) {
  if (items.length === 0) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[var(--z-sticky)] border-t bg-surface-primary/95 dark:bg-surface-primary/95 backdrop-blur-lg shadow-lg transition-[transform,opacity] duration-300 pb-[env(safe-area-inset-bottom)]"
      style={{
        maxHeight: isExpanded ? '50vh' : '80px',
        transform: 'translateY(0)'
      }}
    >
      {/* Minimized Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleExpand}
            className="p-2 hover:bg-surface-hover dark:hover:bg-surface-hover rounded transition-colors"
            aria-label={isExpanded ? 'Collapse comparison bar' : 'Expand comparison bar'}
          >
            <svg
              className={`w-5 h-5 text-primary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <div>
            <h3 className="font-semibold text-primary">
              Comparing {items.length} {items.length === 1 ? 'item' : 'items'}
            </h3>
            <p className="text-xs text-tertiary">
              {isExpanded ? 'Click item for details or view full comparison' : 'Expand to preview'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onViewFullComparison}
            className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors"
          >
            <span className="sm:hidden">Compare</span><span className="hidden sm:inline">View Full Comparison</span>
          </button>
          <button
            onClick={onClearAll}
            className="px-3 py-2 text-sm font-medium text-secondary hover:text-primary dark:hover:text-primary border rounded-lg hover:bg-surface-hover dark:hover:bg-surface-hover transition-colors"
          >
            Clear All
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-tertiary hover:text-primary dark:hover:text-primary transition-colors"
              aria-label="Close comparison bar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Preview Cards */}
      {isExpanded && (
        <div className="p-4 overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(50vh - 80px)' }}>
          <div className="flex gap-3 min-w-min">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex-shrink-0 w-64 p-3 border rounded-lg bg-surface-secondary hover:bg-surface-hover dark:hover:bg-surface-hover transition-colors"
              >
                {/* Item Header */}
                <div className="mb-2">
                  <h4 className="font-semibold text-sm text-primary mb-1">
                    {item.brand} {item.name}
                  </h4>
                  <span className="text-xs text-tertiary capitalize">
                    {item.category}
                  </span>
                </div>

                {/* Price */}
                <div className="mb-2">
                  <span className="text-xs text-tertiary">Used Price:</span>
                  <div className="text-sm font-semibold text-accent">
                    {formatPrice(item.price_used_min, item.price_used_max)}
                  </div>
                </div>

                {/* Match Score */}
                {item.matchScore && (
                  <div className="mb-2">
                    <span className="text-xs text-tertiary">Match: </span>
                    <span className="text-sm font-medium text-primary">
                      {item.matchScore}%
                    </span>
                  </div>
                )}

                {/* Expert Grades (compact) */}
                {(item.crin_tone || item.crin_tech || item.crin_rank) && (
                  <div className="flex flex-wrap gap-1 text-xs">
                    {item.crin_tone && (
                      <span className={`font-medium ${getGradeColor(item.crin_tone)}`}>
                        {item.crin_tone} Tone
                      </span>
                    )}
                    {item.crin_tech && (
                      <>
                        {item.crin_tone && <span className="text-tertiary">|</span>}
                        <span className={`font-medium ${getGradeColor(item.crin_tech)}`}>
                          {item.crin_tech} Tech
                        </span>
                      </>
                    )}
                    {item.crin_rank && (
                      <>
                        {(item.crin_tone || item.crin_tech) && <span className="text-tertiary">|</span>}
                        <span className="font-medium text-primary">
                          #{item.crin_rank}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

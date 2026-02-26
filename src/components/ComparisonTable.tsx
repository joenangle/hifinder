'use client'

interface ComparisonItem {
  id: string
  brand: string
  name: string
  category: string
  price_new?: number | null
  price_used_min?: number | null
  price_used_max?: number | null
  matchScore?: number
  crinacle_sound_signature?: string | null
  sound_signature?: 'neutral' | 'warm' | 'bright' | 'fun' | null
  crin_tone?: string | null
  crin_tech?: string | null
  crin_rank?: number | null
  crin_value?: number | null
  impedance?: number | null
  fit?: string | null
  driver_type?: string | null
  asr_sinad?: number | null
  power_output_mw?: number
  thd_n?: number
  amplificationAssessment?: {
    difficulty: 'easy' | 'moderate' | 'demanding' | 'very_demanding' | 'unknown'
    explanation: string
  }
}

interface ComparisonTableProps {
  items: ComparisonItem[]
}

// Helper to get grade color
function getGradeColor(grade: string): string {
  const firstChar = grade.charAt(0).toUpperCase()
  if (firstChar === 'S') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
  if (firstChar === 'A') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  if (firstChar === 'B') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  if (firstChar === 'C') return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
}

// Format price
function formatPrice(price?: number | null): string {
  return price ? `$${Math.round(price).toLocaleString()}` : 'N/A'
}

function formatPriceRange(min?: number | null, max?: number | null): string {
  if (!min && !max) return 'N/A'
  if (min && max) return `$${Math.round(min).toLocaleString()}-$${Math.round(max).toLocaleString()}`
  return formatPrice(min || max)
}

// Calculate winners
function calculateWinners(items: ComparisonItem[]) {
  const bestMatch = items.reduce((best, item) =>
    (item.matchScore || 0) > (best.matchScore || 0) ? item : best
  )
  const bestValue = items.reduce((best, item) =>
    (item.crin_value || 0) > (best.crin_value || 0) ? item : best
  )
  const topTech = items.reduce((best, item) => {
    const getTechScore = (grade?: string | null) => {
      if (!grade) return 0
      const char = grade.charAt(0).toUpperCase()
      if (char === 'S') return 10 + (grade.includes('+') ? 0.5 : 0)
      if (char === 'A') return 8 + (grade.includes('+') ? 0.5 : grade.includes('-') ? -0.5 : 0)
      if (char === 'B') return 6 + (grade.includes('+') ? 0.5 : grade.includes('-') ? -0.5 : 0)
      if (char === 'C') return 4
      return 2
    }
    return getTechScore(item.crin_tech) > getTechScore(best.crin_tech) ? item : best
  })

  return { bestMatch, bestValue, topTech }
}

export function ComparisonTable({ items }: ComparisonTableProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary dark:text-text-secondary">
        No items to compare. Select items from the recommendations page.
      </div>
    )
  }

  const winners = calculateWinners(items)

  // Group items by category (reserved for future filtering)
  const _headphones = items.filter(i => i.category === 'cans')
  const _iems = items.filter(i => i.category === 'iems')
  const _signalGear = items.filter(i => ['dac', 'amp', 'dac_amp'].includes(i.category))

  const renderRow = (label: string, getValue: (item: ComparisonItem) => React.ReactNode, _highlightBest?: boolean) => (
    <tr className="border-b border-border-default dark:border-border-default">
      <td className="sticky left-0 bg-surface-secondary dark:bg-surface-secondary px-4 py-3 font-medium text-sm text-text-primary dark:text-text-primary whitespace-nowrap z-10">
        {label}
      </td>
      {items.map((item) => (
        <td key={item.id} className="px-4 py-3 text-sm text-text-secondary dark:text-text-secondary whitespace-nowrap">
          {getValue(item)}
        </td>
      ))}
    </tr>
  )

  return (
    <div className="overflow-x-auto">
      {/* Winners Banner */}
      <div className="mb-4 p-4 bg-surface-hover dark:bg-surface-hover rounded-lg flex flex-wrap gap-4 justify-center text-sm">
        {winners.bestMatch.matchScore && (
          <div className="flex items-center gap-2">
            <span>🏆</span>
            <span className="font-semibold text-text-primary dark:text-text-primary">Best Match:</span>
            <span className="text-text-secondary dark:text-text-secondary">
              {winners.bestMatch.brand} {winners.bestMatch.name}
            </span>
          </div>
        )}
        {winners.bestValue.crin_value && (
          <div className="flex items-center gap-2">
            <span>💰</span>
            <span className="font-semibold text-text-primary dark:text-text-primary">Best Value:</span>
            <span className="text-text-secondary dark:text-text-secondary">
              {winners.bestValue.brand} {winners.bestValue.name}
            </span>
          </div>
        )}
        {winners.topTech.crin_tech && (
          <div className="flex items-center gap-2">
            <span>🔬</span>
            <span className="font-semibold text-text-primary dark:text-text-primary">Top Tech:</span>
            <span className="text-text-secondary dark:text-text-secondary">
              {winners.topTech.brand} {winners.topTech.name}
            </span>
          </div>
        )}
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-border-default dark:border-border-default bg-surface-secondary dark:bg-surface-secondary">
            <th className="sticky left-0 bg-surface-secondary dark:bg-surface-secondary px-4 py-3 text-left text-sm font-semibold text-text-primary dark:text-text-primary z-10">
              Specification
            </th>
            {items.map((item) => (
              <th key={item.id} className="px-4 py-3 text-left min-w-[200px]">
                <div className="font-semibold text-text-primary dark:text-text-primary">
                  {item.brand}
                </div>
                <div className="text-sm font-normal text-text-secondary dark:text-text-secondary">
                  {item.name}
                </div>
                <div className="text-xs text-text-tertiary dark:text-text-tertiary capitalize mt-1">
                  {item.category}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Pricing Section */}
          {renderRow('Used Price Range', (item) => (
            <span className="font-semibold text-accent-primary dark:text-accent-primary">
              {formatPriceRange(item.price_used_min, item.price_used_max)}
            </span>
          ))}
          {renderRow('MSRP', (item) => formatPrice(item.price_new))}

          {/* Match Score Section */}
          {items.some(i => i.matchScore) && (
            <tr className="bg-surface-hover/50 dark:bg-surface-hover/50">
              <td colSpan={items.length + 1} className="px-4 py-2 text-xs font-semibold text-text-tertiary dark:text-text-tertiary uppercase tracking-wide">
                Match & Performance
              </td>
            </tr>
          )}
          {items.some(i => i.matchScore) && renderRow('Match Score', (item) => (
            item.matchScore ? (
              <div className="flex items-center gap-2">
                <span className="font-semibold">{item.matchScore}%</span>
                <span>
                  {item.matchScore >= 85 ? '⭐⭐⭐⭐⭐' :
                   item.matchScore >= 75 ? '⭐⭐⭐⭐' :
                   item.matchScore >= 65 ? '⭐⭐⭐' :
                   item.matchScore >= 55 ? '⭐⭐' : '⭐'}
                </span>
              </div>
            ) : 'N/A'
          ))}

          {/* Expert Grades Section (Headphones/IEMs) */}
          {items.some(i => i.crin_tone || i.crin_tech || i.crin_rank) && (
            <tr className="bg-surface-hover/50 dark:bg-surface-hover/50">
              <td colSpan={items.length + 1} className="px-4 py-2 text-xs font-semibold text-text-tertiary dark:text-text-tertiary uppercase tracking-wide">
                Expert Ratings (Crinacle)
              </td>
            </tr>
          )}
          {items.some(i => i.crin_tone) && renderRow('Tone Grade', (item) => (
            item.crin_tone ? (
              <span className={`inline-block px-2 py-1 rounded font-semibold ${getGradeColor(item.crin_tone)}`}>
                {item.crin_tone}
              </span>
            ) : 'N/A'
          ))}
          {items.some(i => i.crin_tech) && renderRow('Technical Grade', (item) => (
            item.crin_tech ? (
              <span className={`inline-block px-2 py-1 rounded font-semibold ${getGradeColor(item.crin_tech)}`}>
                {item.crin_tech}
              </span>
            ) : 'N/A'
          ))}
          {items.some(i => i.crin_rank) && renderRow('Rank', (item) => (
            item.crin_rank ? `#${item.crin_rank}` : 'N/A'
          ))}
          {items.some(i => i.crin_value) && renderRow('Value Rating', (item) => (
            item.crin_value ? (
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < item.crin_value! ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-500'}>
                    ★
                  </span>
                ))}
                <span className="ml-1 text-xs">({item.crin_value}/5)</span>
              </div>
            ) : 'N/A'
          ))}

          {/* Technical Specs Section */}
          {items.some(i => i.crinacle_sound_signature || i.sound_signature || i.impedance || i.fit || i.driver_type) && (
            <tr className="bg-surface-hover/50 dark:bg-surface-hover/50">
              <td colSpan={items.length + 1} className="px-4 py-2 text-xs font-semibold text-text-tertiary dark:text-text-tertiary uppercase tracking-wide">
                Technical Specifications
              </td>
            </tr>
          )}
          {items.some(i => i.crinacle_sound_signature || i.sound_signature) && renderRow('Sound Signature', (item) => (
            item.crinacle_sound_signature || item.sound_signature || 'N/A'
          ))}
          {items.some(i => i.impedance) && renderRow('Impedance', (item) => (
            item.impedance ? `${item.impedance}Ω` : 'N/A'
          ))}
          {items.some(i => i.fit) && renderRow('Fit', (item) => item.fit || 'N/A')}
          {items.some(i => i.driver_type) && renderRow('Driver Type', (item) => item.driver_type || 'N/A')}
          {items.some(i => i.amplificationAssessment) && renderRow('Amplification', (item) => {
            if (!item.amplificationAssessment) return 'N/A'
            const { difficulty } = item.amplificationAssessment
            return difficulty === 'easy' ? '⚡ Easy to Drive' :
                   difficulty === 'moderate' ? '⚡⚡ Moderate Power' :
                   difficulty === 'demanding' ? '⚡⚡⚡ Needs Good Amp' :
                   difficulty === 'very_demanding' ? '⚡⚡⚡⚡ Needs Powerful Amp' : 'Unknown'
          })}

          {/* ASR Performance Section (Signal Gear) */}
          {items.some(i => i.asr_sinad || i.power_output_mw || i.thd_n) && (
            <tr className="bg-surface-hover/50 dark:bg-surface-hover/50">
              <td colSpan={items.length + 1} className="px-4 py-2 text-xs font-semibold text-text-tertiary dark:text-text-tertiary uppercase tracking-wide">
                ASR Performance Measurements
              </td>
            </tr>
          )}
          {items.some(i => i.asr_sinad) && renderRow('SINAD', (item) => (
            item.asr_sinad ? (
              <div>
                <span className="font-semibold">{item.asr_sinad} dB</span>
                <span className="ml-2 text-xs">
                  {item.asr_sinad >= 120 ? '(Excellent)' :
                   item.asr_sinad >= 110 ? '(Very Good)' :
                   item.asr_sinad >= 100 ? '(Good)' : '(Fair)'}
                </span>
              </div>
            ) : 'N/A'
          ))}
          {items.some(i => i.power_output_mw) && renderRow('Power Output', (item) => (
            item.power_output_mw ? `${item.power_output_mw} mW` : 'N/A'
          ))}
          {items.some(i => i.thd_n) && renderRow('THD+N', (item) => (
            item.thd_n ? `${item.thd_n}%` : 'N/A'
          ))}
        </tbody>
      </table>
    </div>
  )
}

'use client'

import { useState } from 'react'

interface ExpertAnalysisProps {
  component: {
    crin_signature?: string | null
    crin_tone?: string | null
    crin_tech?: string | null
    crin_comments?: string | null
    driver_type?: string | null
    fit?: string | null
    crin_rank?: number | null
    crin_value?: number | null
  }
  totalRankedComponents?: number
  forceExpanded?: boolean
}

function generateExpertBlurb(component: ExpertAnalysisProps['component']): string {
  const parts: string[] = []

  // Start with sound signature (most important for users)
  if (component.crin_signature) {
    parts.push(`${component.crin_signature} signature`)
  }

  // Add grades when available
  const grades: string[] = []
  if (component.crin_tone) grades.push(`${component.crin_tone} tone`)
  if (component.crin_tech) grades.push(`${component.crin_tech} technical`)
  if (grades.length > 0) {
    parts.push(`[${grades.join(', ')} grades]`)
  }

  // Add ranking context
  if (component.crin_rank) {
    parts.push(`Ranked #${component.crin_rank} by Crinacle`)
  }

  // Add value assessment
  if (component.crin_value) {
    const valueText = component.crin_value >= 4 ? 'excellent value' :
                     component.crin_value >= 3 ? 'good value' : 'fair value'
    parts.push(`${valueText} (${component.crin_value}/5)`)
  }

  // Add technical details
  const techDetails: string[] = []
  if (component.driver_type) techDetails.push(`${component.driver_type} drivers`)
  if (component.fit) techDetails.push(`${component.fit} fit`)
  if (techDetails.length > 0) {
    parts.push(techDetails.join(', '))
  }

  return parts.join('. ') + '.'
}

// Helper function to get grade color
function getGradeColor(grade: string): string {
  const firstChar = grade.charAt(0).toUpperCase()
  if (firstChar === 'S') return 'text-yellow-600 dark:text-yellow-400' // Gold for S+/S
  if (firstChar === 'A') return 'text-green-600 dark:text-green-400'
  if (firstChar === 'B') return 'text-blue-600 dark:text-blue-400'
  if (firstChar === 'C') return 'text-orange-600 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400' // D/F
}

// Helper function to calculate percentile
function calculatePercentile(rank: number, total: number): number {
  // Validate inputs to prevent NaN
  if (!rank || !total || rank <= 0 || total <= 0) {
    return 0
  }
  return Math.round((1 - (rank - 1) / total) * 100)
}

// Compact expert badge for card headers (when panel is collapsed)
export function CompactExpertBadge({ component }: { component: ExpertAnalysisProps['component'] }) {
  const hasGrades = component.crin_tone || component.crin_tech || component.crin_rank

  if (!hasGrades) return null

  return (
    <div className="flex items-center gap-2 text-[10px] text-text-tertiary dark:text-text-tertiary">
      {component.crin_tone && (
        <span className={`font-medium ${getGradeColor(component.crin_tone)}`}>
          {component.crin_tone} Tone
        </span>
      )}
      {component.crin_tech && (
        <span className="text-text-tertiary dark:text-text-tertiary">|</span>
      )}
      {component.crin_tech && (
        <span className={`font-medium ${getGradeColor(component.crin_tech)}`}>
          {component.crin_tech} Tech
        </span>
      )}
      {component.crin_rank && (
        <>
          <span className="text-text-tertiary dark:text-text-tertiary">|</span>
          <span className="font-medium">Rank #{component.crin_rank}</span>
        </>
      )}
    </div>
  )
}

export function ExpertAnalysisPanel({ component, totalRankedComponents = 400, forceExpanded = false }: ExpertAnalysisProps) {
  // Start collapsed by default, but can be overridden by forceExpanded
  const [isExpanded, setIsExpanded] = useState(false)

  // Use forceExpanded if provided, otherwise use local state
  const expanded = forceExpanded || isExpanded

  // Check if component has any expert data
  const hasExpertData = !!(
    component.crin_signature ||
    component.crin_tone ||
    component.crin_tech ||
    component.crin_comments ||
    component.crin_rank ||
    component.crin_value
  )

  if (!hasExpertData) {
    return null
  }

  const blurb = generateExpertBlurb(component)

  return (
    <div className="border-t border-border-default dark:border-border-default pt-2 mt-2">
      <button
        onClick={(e) => {
          e.stopPropagation() // Prevent card selection
          setIsExpanded(!isExpanded)
        }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-text-secondary dark:text-text-secondary hover:text-text-primary dark:hover:text-text-primary hover:bg-surface-hover dark:hover:bg-surface-hover transition-colors border border-border-subtle"
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        {expanded ? 'Hide expert analysis' : 'Show expert analysis'}
        <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-2 text-xs text-text-primary dark:text-text-primary leading-relaxed space-y-3">
          {/* Visual Grade Summary Bar */}
          {(component.crin_tone || component.crin_tech || component.crin_rank) && (
            <div className="flex items-center gap-3 p-2 bg-surface-hover dark:bg-surface-hover rounded">
              {component.crin_tone && (
                <div className="flex items-center gap-1">
                  <span className="text-text-tertiary dark:text-text-tertiary">Tone:</span>
                  <span className={`font-bold ${getGradeColor(component.crin_tone)}`}>
                    {component.crin_tone}
                  </span>
                </div>
              )}
              {component.crin_tech && (
                <div className="flex items-center gap-1">
                  <span className="text-text-tertiary dark:text-text-tertiary">Tech:</span>
                  <span className={`font-bold ${getGradeColor(component.crin_tech)}`}>
                    {component.crin_tech}
                  </span>
                </div>
              )}
              {component.crin_rank && (
                <div className="flex items-center gap-1">
                  <span className="text-text-tertiary dark:text-text-tertiary">Rank:</span>
                  <span className="font-bold text-accent-primary dark:text-accent-primary">
                    #{component.crin_rank}
                  </span>
                  {(() => {
                    const percentile = calculatePercentile(component.crin_rank, totalRankedComponents)
                    return percentile > 0 ? (
                      <span className="text-text-tertiary dark:text-text-tertiary text-[10px]">
                        (Top {percentile}%)
                      </span>
                    ) : null
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Value Rating with Visual Stars */}
          {component.crin_value && (
            <div className="flex items-center gap-2">
              <span className="text-text-tertiary dark:text-text-tertiary">Value:</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={i < component.crin_value! ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-500'}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-text-tertiary dark:text-text-tertiary text-[10px]">
                ({component.crin_value}/5)
              </span>
            </div>
          )}

          <p className="text-text-secondary dark:text-text-secondary">{blurb}</p>

          {/* Show original comments if available */}
          {component.crin_comments && (
            <div className="bg-surface-hover dark:bg-surface-hover p-2 rounded text-xs italic border-l-2 border-accent-primary dark:border-accent-primary">
              <strong>Crinacle:</strong> &ldquo;{component.crin_comments}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { Quote } from 'lucide-react'

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
  forceExpanded?: boolean
  inline?: boolean
}

// Crinacle value scale: ★ Worth the price, ★★ Redefines bracket, ★★★ Worth the blind buy
function valueLabel(v: number): string {
  return v >= 3 ? 'Worth the blind buy' : v >= 2 ? 'Redefines the bracket' : 'Worth the price'
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
  if (component.crin_value && component.crin_value > 0) {
    parts.push(`${valueLabel(component.crin_value).toLowerCase()} (${component.crin_value}/3)`)
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

// Compact expert badge for card headers (when panel is collapsed)
export function CompactExpertBadge({ component }: { component: ExpertAnalysisProps['component'] }) {
  const hasGrades = component.crin_tone || component.crin_tech || component.crin_rank

  if (!hasGrades) return null

  return (
    <div className="flex items-center gap-2 text-[10px] text-tertiary">
      {component.crin_tone && (
        <span className={`font-medium ${getGradeColor(component.crin_tone)}`}>
          {component.crin_tone} Tone
        </span>
      )}
      {component.crin_tech && (
        <span className="text-tertiary">|</span>
      )}
      {component.crin_tech && (
        <span className={`font-medium ${getGradeColor(component.crin_tech)}`}>
          {component.crin_tech} Tech
        </span>
      )}
      {component.crin_rank && (
        <>
          <span className="text-tertiary">|</span>
          <span className="font-medium">Rank #{component.crin_rank}</span>
        </>
      )}
    </div>
  )
}

export function ExpertAnalysisPanel({ component, forceExpanded = false, inline = false }: ExpertAnalysisProps) {
  // Start collapsed by default, but can be overridden by forceExpanded
  const [isExpanded, setIsExpanded] = useState(false)
  // Track whether user has explicitly overridden the forceExpanded state
  const [userOverride, setUserOverride] = useState<boolean | null>(null)

  // Reset user override when the global forceExpanded toggle changes
  useEffect(() => {
    setUserOverride(null)
  }, [forceExpanded])

  // Use user's explicit override if set, then forceExpanded, then local state
  const expanded = userOverride !== null ? userOverride : (forceExpanded || isExpanded)

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

  // Inline mode: compact always-visible quote, no toggle
  if (inline) {
    const quote = component.crin_comments || generateExpertBlurb(component)
    return (
      <div className="mt-1 flex items-start gap-1.5 text-xs text-tertiary">
        <p className="italic line-clamp-1 sm:line-clamp-2 leading-snug min-w-0">
          {component.crin_comments ? `"${quote}"` : quote}
        </p>
      </div>
    )
  }

  const blurb = generateExpertBlurb(component)

  return (
    <div className="border-t pt-2 mt-2">
      <button
        onClick={(e) => {
          e.stopPropagation() // Prevent card selection
          const next = !expanded
          setIsExpanded(next)
          // If user is overriding forceExpanded, track the explicit choice
          setUserOverride(next)
        }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-secondary hover:text-primary hover:bg-surface-hover transition-colors border border-subtle"
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
        <div className="mt-2 text-xs text-primary leading-relaxed space-y-3">
          {/* Value Rating */}
          {component.crin_value != null && component.crin_value > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-tertiary">Value:</span>
              <span className="font-medium text-primary">{valueLabel(component.crin_value)}</span>
              <span className="text-tertiary text-[10px]">({component.crin_value}/3)</span>
            </div>
          )}

          <p className="text-secondary">{blurb}</p>

          {/* Show original comments if available */}
          {component.crin_comments && (
            <div className="flex items-start gap-2 bg-surface-hover p-2 rounded text-xs italic">
              <Quote className="w-3.5 h-3.5 text-tertiary shrink-0 mt-0.5" aria-hidden="true" />
              <p><strong>Crinacle:</strong> &ldquo;{component.crin_comments}&rdquo;</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
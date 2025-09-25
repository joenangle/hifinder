'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

interface ExpertAnalysisProps {
  component: {
    crinacle_sound_signature?: string
    tone_grade?: string
    technical_grade?: string
    crinacle_comments?: string
    driver_type?: string
    fit?: string
    crinacle_rank?: number
    value_rating?: number
  }
}

function generateExpertBlurb(component: ExpertAnalysisProps['component']): string {
  const parts: string[] = []

  // Start with sound signature (most important for users)
  if (component.crinacle_sound_signature) {
    parts.push(`${component.crinacle_sound_signature} signature`)
  }

  // Add grades when available
  const grades: string[] = []
  if (component.tone_grade) grades.push(`${component.tone_grade} tone`)
  if (component.technical_grade) grades.push(`${component.technical_grade} technical`)
  if (grades.length > 0) {
    parts.push(`[${grades.join(', ')} grades]`)
  }

  // Add ranking context
  if (component.crinacle_rank) {
    parts.push(`Ranked #${component.crinacle_rank} by Crinacle`)
  }

  // Add value assessment
  if (component.value_rating) {
    const valueText = component.value_rating >= 4 ? 'excellent value' :
                     component.value_rating >= 3 ? 'good value' : 'fair value'
    parts.push(`${valueText} (${component.value_rating}/5)`)
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

export function ExpertAnalysisPanel({ component }: ExpertAnalysisProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Check if component has any expert data
  const hasExpertData = !!(
    component.crinacle_sound_signature ||
    component.tone_grade ||
    component.technical_grade ||
    component.crinacle_comments ||
    component.crinacle_rank ||
    component.value_rating
  )

  if (!hasExpertData) {
    return (
      <div className="text-xs text-gray-400 italic py-2">
        Expert analysis not yet available
      </div>
    )
  }

  const blurb = generateExpertBlurb(component)

  return (
    <div className="border-t border-gray-100 pt-2 mt-2">
      <button
        onClick={(e) => {
          e.stopPropagation() // Prevent card selection
          setIsExpanded(!isExpanded)
        }}
        className="flex items-center justify-between w-full text-left text-xs text-gray-600 hover:text-gray-800 transition-colors"
      >
        <span className="font-medium">Expert Analysis</span>
        {isExpanded ? (
          <ChevronUpIcon className="w-3 h-3" />
        ) : (
          <ChevronDownIcon className="w-3 h-3" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 text-xs text-gray-700 leading-relaxed">
          <p className="mb-2">{blurb}</p>

          {/* Show original comments if available */}
          {component.crinacle_comments && (
            <div className="bg-gray-50 p-2 rounded text-xs italic">
              <strong>Crinacle:</strong> "{component.crinacle_comments}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
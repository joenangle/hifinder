'use client'

import { useState, useMemo } from 'react'

export type DisclosureStage = 0 | 1 | 2

interface UseDisclosureStageArgs {
  selectedCans: Map<string, unknown>
  selectedIems: Map<string, unknown>
  selectedDacs: Map<string, unknown>
  selectedAmps: Map<string, unknown>
  selectedDacAmps: Map<string, unknown>
  searchParams: URLSearchParams
}

export function useDisclosureStage({
  selectedCans,
  selectedIems,
  selectedDacs,
  selectedAmps,
  selectedDacAmps,
  searchParams,
}: UseDisclosureStageArgs) {
  const [advancedMode, setAdvancedModeState] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('hifinder_advanced_mode') === 'true'
  })

  const setAdvancedMode = (v: boolean) => {
    localStorage.setItem('hifinder_advanced_mode', v ? 'true' : 'false')
    setAdvancedModeState(v)
  }

  const resetAdvancedMode = () => {
    localStorage.removeItem('hifinder_advanced_mode')
    setAdvancedModeState(false)
  }

  const stage: DisclosureStage = useMemo(() => {
    if (advancedMode) return 2

    // URL params that imply the user/sharer intended to see filters
    const soundParam = searchParams.get('soundSignatures') || searchParams.get('sound')
    const typeParam = searchParams.get('type') || searchParams.get('headphoneType')
    const wantParam = searchParams.get('want') || searchParams.get('wantRecommendationsFor')

    const urlImpliesStage1 = !!(
      soundParam ||
      (typeParam && typeParam !== 'both')
    )
    const urlImpliesStage2 = !!(
      wantParam && (wantParam.includes('dac') || wantParam.includes('amp') || wantParam.includes('combo'))
    )

    // Selection-based detection
    const hasHeadphoneSelection = selectedCans.size > 0 || selectedIems.size > 0
    const hasSignalSelection = selectedDacs.size > 0 || selectedAmps.size > 0 || selectedDacAmps.size > 0
    const selectedCategoryCount = [
      selectedCans.size > 0 || selectedIems.size > 0,
      selectedDacs.size > 0,
      selectedAmps.size > 0,
      selectedDacAmps.size > 0,
    ].filter(Boolean).length

    if (selectedCategoryCount >= 2 || hasSignalSelection || urlImpliesStage2) return 2
    if (hasHeadphoneSelection || urlImpliesStage1) return 1
    return 0
  }, [advancedMode, selectedCans, selectedIems, selectedDacs, selectedAmps, selectedDacAmps, searchParams])

  return { stage, advancedMode, setAdvancedMode, resetAdvancedMode }
}

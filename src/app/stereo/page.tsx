import { Suspense } from 'react'
import { StereoBuilder } from '@/components/stereo/StereoBuilder'
import { CATEGORY } from '@/lib/component-categories'
import { supabaseServer } from '@/lib/supabase-server'

/** Rows in a stereo category, or null if the count fails (the page still works without it). */
async function catalogCount(category: string): Promise<number | null> {
  const { count, error } = await supabaseServer
    .from('components')
    .select('id', { count: 'exact', head: true })
    .eq('category', category)
  if (error) {
    console.error('Stereo catalog count failed:', error)
    return null
  }
  return count
}

export default async function StereoPage() {
  const [speakers, amp] = await Promise.all([
    catalogCount(CATEGORY.SPEAKERS),
    catalogCount(CATEGORY.SPEAKER_AMP),
  ])
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StereoBuilder catalogCounts={{ speakers, amp }} />
    </Suspense>
  )
}

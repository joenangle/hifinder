import { Suspense } from 'react'
import { StereoBuilder } from '@/components/stereo/StereoBuilder'

export default function StereoPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StereoBuilder />
    </Suspense>
  )
}

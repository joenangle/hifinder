'use client'

import { useSession } from 'next-auth/react'
import { LandingPageV2 } from '@/components/LandingPageV2'
import { UserDashboard } from '@/components/UserDashboard'

export default function Home() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <main className="page-container">
        <div className="text-center mt-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
        </div>
      </main>
    )
  }

  // Show user dashboard for signed-in users, landing page for signed-out users
  return session ? <UserDashboard /> : <LandingPageV2 />
}
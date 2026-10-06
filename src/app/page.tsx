import { getCachedServerSession } from '@/lib/auth'
import { LandingPage } from '@/components/landing/LandingPage'
import { UserDashboard } from '@/components/dashboard/UserDashboard'

export const metadata = {
  alternates: { canonical: '/' },
}

export default async function Home() {
  const session = await getCachedServerSession()

  // Show user dashboard for signed-in users, landing page for signed-out users
  return session ? <UserDashboard /> : <LandingPage />
}

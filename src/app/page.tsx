import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { LandingPage } from '@/components/LandingPage'
import { UserDashboard } from '@/components/UserDashboard'

export default async function Home() {
  const session = await getServerSession(authOptions)

  // Show user dashboard for signed-in users, landing page for signed-out users
  return session ? <UserDashboard /> : <LandingPage />
}

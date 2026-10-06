import { redirect } from 'next/navigation'
import { getCachedServerSession } from '@/lib/auth'

export const metadata = {
  title: 'Dashboard | HiFinder',
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // redirect() only works during render, so gate on the server rather than in a client effect
  if (!(await getCachedServerSession())) {
    redirect('/auth/signin?callbackUrl=/dashboard')
  }
  return children
}

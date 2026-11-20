import { redirect } from 'next/navigation'
import { getCachedServerSession, requireAdmin } from '@/lib/auth'

export const metadata = {
  title: 'Admin | HiFinder',
  robots: { index: false, follow: false },
}

// Server-side gate. The admin page is a client component; without this its
// code and UI shell ship to anyone who visits /admin. Every /api/admin/* route
// still checks requireAdmin() on its own: this guard is not the data boundary.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await getCachedServerSession())) {
    redirect('/auth/signin?callbackUrl=/admin')
  }
  if (!(await requireAdmin())) {
    redirect('/')
  }
  return children
}

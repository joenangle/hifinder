// Signed-in page: give it its own title and keep it out of search results
export const metadata = {
  title: 'Settings | HiFinder',
  robots: { index: false, follow: false },
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children
}

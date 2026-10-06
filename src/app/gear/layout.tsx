// Signed-in page: give it its own title and keep it out of search results
export const metadata = {
  title: 'My Gear | HiFinder',
  robots: { index: false, follow: false },
}

export default function GearLayout({ children }: { children: React.ReactNode }) {
  return children
}

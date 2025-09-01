import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mb-4">HiFinder</h1>
        <p className="text-xl mb-8 text-gray-300">
          Find your perfect headphone setup in minutes
        </p>
        <div className="flex gap-4">
          <Link 
            href="/onboarding"
            className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg text-lg font-medium inline-block"
          >
            Get Started →
          </Link>
          <Link 
            href="/learn"
            className="bg-gray-700 hover:bg-gray-600 px-8 py-4 rounded-lg text-lg font-medium inline-block"
          >
            📚 Learn Audio
          </Link>
        </div>
      </div>
    </main>
  )
}
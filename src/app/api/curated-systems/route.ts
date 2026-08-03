import { NextResponse } from 'next/server'
import { getCuratedSystems } from '@/lib/curated-systems'

export const revalidate = 3600

export async function GET() {
  try {
    const systems = await getCuratedSystems()
    return NextResponse.json({ systems })
  } catch (error) {
    console.error('Error in curated-systems API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

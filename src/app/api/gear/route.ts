import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { addGearItem, getUserGear } from '@/lib/gear'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const gear = await getUserGear(session.user.id)
    return NextResponse.json(gear)
  } catch (error) {
    console.error('Error fetching gear:', error)
    return NextResponse.json(
      { error: 'Failed to fetch gear' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const newItem = await addGearItem(session.user.id, body)
    
    if (!newItem) {
      return NextResponse.json(
        { error: 'Failed to add gear item' },
        { status: 500 }
      )
    }

    return NextResponse.json(newItem, { status: 201 })
  } catch (error) {
    console.error('Error adding gear:', error)
    return NextResponse.json(
      { error: 'Failed to add gear item' },
      { status: 500 }
    )
  }
}
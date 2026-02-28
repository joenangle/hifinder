import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const componentId = resolvedParams.id

    // Fetch all ratings for the component
    const { data: ratings, error } = await supabaseServer
      .from('component_ratings')
      .select('rating, review_text, created_at')
      .eq('component_id', componentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching ratings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!ratings || ratings.length === 0) {
      return NextResponse.json({
        average: 0,
        count: 0,
        distribution: [1, 2, 3, 4, 5].map(star => ({ star, count: 0 })),
        reviews: [],
      })
    }

    // Compute average and count
    const count = ratings.length
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0)
    const average = Math.round((sum / count) * 10) / 10

    // Compute distribution
    const distribution = [1, 2, 3, 4, 5].map(star => ({
      star,
      count: ratings.filter(r => r.rating === star).length,
    }))

    // Recent reviews (where review_text is not null), limit 10
    const reviews = ratings
      .filter(r => r.review_text)
      .slice(0, 10)
      .map(r => ({
        rating: r.rating,
        review_text: r.review_text,
        created_at: r.created_at,
      }))

    return NextResponse.json({
      average,
      count,
      distribution,
      reviews,
    }, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }
    })
  } catch (error) {
    console.error('Ratings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const componentId = resolvedParams.id

    const body = await request.json()
    const { rating, review_text } = body

    // Validate rating is 1-5
    if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be an integer between 1 and 5' },
        { status: 400 }
      )
    }

    // Validate review_text length if provided
    if (review_text && review_text.length > 500) {
      return NextResponse.json(
        { error: 'Review text must be 500 characters or fewer' },
        { status: 400 }
      )
    }

    // Upsert the user's rating (unique constraint on user_id + component_id)
    const { data, error } = await supabaseServer
      .from('component_ratings')
      .upsert(
        {
          user_id: session.user.id,
          component_id: componentId,
          rating,
          review_text: review_text || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,component_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('Error upserting rating:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Ratings POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

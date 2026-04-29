import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const componentId = resolvedParams.id

    // Fetch top mentions by post score
    const { data: mentions, error: mentionsError } = await supabaseServer
      .from('reddit_mentions')
      .select('mention_context, post_title, post_url, post_score, subreddit, post_created_utc, is_recommendation')
      .eq('component_id', componentId)
      .order('post_score', { ascending: false, nullsFirst: false })
      .limit(5)

    if (mentionsError) {
      console.error('Error fetching social mentions:', mentionsError)
      return NextResponse.json({ error: mentionsError.message }, { status: 500 })
    }

    // Get aggregate counts
    const { count: mentionCount, error: countError } = await supabaseServer
      .from('reddit_mentions')
      .select('*', { count: 'exact', head: true })
      .eq('component_id', componentId)

    // Get 30-day count
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { count: mentionCount30d } = await supabaseServer
      .from('reddit_mentions')
      .select('*', { count: 'exact', head: true })
      .eq('component_id', componentId)
      .gte('post_created_utc', thirtyDaysAgo)

    // Get subreddit breakdown
    const { data: subredditData } = await supabaseServer
      .from('reddit_mentions')
      .select('subreddit')
      .eq('component_id', componentId)

    const subredditBreakdown: Record<string, number> = {}
    if (subredditData) {
      for (const row of subredditData) {
        subredditBreakdown[row.subreddit] = (subredditBreakdown[row.subreddit] || 0) + 1
      }
    }

    // Get last mentioned date
    const { data: lastMention } = await supabaseServer
      .from('reddit_mentions')
      .select('post_created_utc')
      .eq('component_id', componentId)
      .order('post_created_utc', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      mentionCount: mentionCount || 0,
      mentionCount30d: mentionCount30d || 0,
      lastMentioned: lastMention?.post_created_utc || null,
      topMentions: (mentions || []).map(m => ({
        context: m.mention_context,
        postTitle: m.post_title,
        postUrl: m.post_url,
        postScore: m.post_score,
        subreddit: m.subreddit,
        date: m.post_created_utc,
        isRecommendation: m.is_recommendation,
      })),
      subredditBreakdown,
    }, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' }
    })
  } catch (error) {
    console.error('Social GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

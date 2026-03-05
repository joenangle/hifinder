# P2 Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 5 remaining P2 features: social sharing, user ratings, popular pairings, multi-retailer links, and upgrade advisor.

**Architecture:** Each feature adds a section to existing pages (ComponentDetailModal, Dashboard, StackBuilderModal). New API routes follow existing patterns (Next.js App Router, Supabase client). One new DB table (component_ratings); remaining features compute from existing data.

**Tech Stack:** Next.js 16 (App Router), React 19, Supabase, Tailwind CSS v4, Framer Motion, Lucide icons

---

## Task 1: Social Sharing — OG Tags + Share Buttons (2.3)

### Context
- `src/app/recommendations/page.tsx` is `'use client'` — cannot export `generateMetadata` directly
- Share button in `src/components/StackBuilderModal.tsx:640-650` copies URL to clipboard (no feedback)
- No toast library installed — use inline state-based feedback

### Step 1: Create client component file for recommendations content

Move the client component out of `page.tsx` so the page file can become a server component with metadata.

Create `src/app/recommendations/recommendations-content.tsx`:
- Copy the entire `'use client'` block from `page.tsx` (lines 1-1896) including all imports, `AudioComponent` interface, and `RecommendationsContent` function
- Export `RecommendationsContent` as a named export

### Step 2: Convert page.tsx to server component with dynamic OG metadata

Rewrite `src/app/recommendations/page.tsx` to:

```tsx
import { Suspense } from 'react'
import { Metadata } from 'next'
import { RecommendationsContent } from './recommendations-content'
import { createClient } from '@supabase/supabase-js'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = await searchParams
  const budget = params.budget as string | undefined
  const componentIds = (params.components as string)?.split(',').filter(Boolean) || []

  let title = 'HiFinder — Audio System Builder'
  let description = 'Build your perfect audio system with expert-matched recommendations for headphones, DACs, and amps.'

  if (componentIds.length > 0) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data } = await supabase
        .from('components')
        .select('brand, name')
        .in('id', componentIds)

      if (data && data.length > 0) {
        const names = data.map(c => `${c.brand} ${c.name}`).join(' + ')
        title = `HiFinder Stack: ${names}`
        if (budget) {
          title += ` — $${budget}`
        }
        description = `Check out this ${data.length}-piece audio stack${budget ? ` for $${budget}` : ''}: ${names}. Built with HiFinder.`
      }
    } catch {
      // Fall back to defaults
    }
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: 'https://hifinder.app/recommendations',
      siteName: 'HiFinder',
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default function RecommendationsPage() {
  return (
    <Suspense fallback={
      <div className="page-container">
        <div className="text-center mt-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
        </div>
      </div>
    }>
      <RecommendationsContent />
    </Suspense>
  )
}
```

### Step 3: Add share buttons + toast to StackBuilderModal

Modify `src/components/StackBuilderModal.tsx:640-650`. Replace the current share button:

```tsx
// Add state near top of component:
const [shareToast, setShareToast] = useState(false)

// Replace share button (around line 640):
<div className="relative">
  <button
    onClick={async () => {
      const shareUrl = `${window.location.origin}/recommendations?` +
        `budget=${Math.round(totalCost)}&` +
        `components=${finalComponents.map(c => c.id).join(',')}`

      // Try Web Share API first (mobile)
      if (navigator.share) {
        try {
          await navigator.share({
            title: `HiFinder Stack — $${Math.round(totalCost)}`,
            text: `Check out this ${finalComponents.length}-piece audio stack!`,
            url: shareUrl,
          })
          return
        } catch {
          // User cancelled or API failed, fall through to clipboard
        }
      }

      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareUrl)
      setShareToast(true)
      setTimeout(() => setShareToast(false), 2000)
    }}
    className="px-4 py-2 text-orange-500 dark:text-orange-400 border border-orange-300 dark:border-orange-700 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors"
  >
    Share Stack
  </button>
  {shareToast && (
    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-600 text-white text-xs rounded shadow-lg whitespace-nowrap">
      Link copied!
    </div>
  )}
</div>
```

### Step 4: Verify build

Run: `npm run build`
Expected: Clean build, no type errors. OG tags visible at `/recommendations?budget=500&components=1,2,3`.

### Step 5: Commit

```bash
git add src/app/recommendations/page.tsx src/app/recommendations/recommendations-content.tsx src/components/StackBuilderModal.tsx
git commit -m "feat: add dynamic OG tags and share buttons for recommendations (2.3)"
```

---

## Task 2: User Ratings & Mini-Reviews (3.1)

### Context
- New `component_ratings` table needed in Supabase
- API route at `/api/components/[id]/ratings`
- New section in `ComponentDetailModal.tsx` between sound signature (line 260) and footer (line 263)
- Auth via next-auth session for writes

### Step 1: Create Supabase migration

Create `supabase/migrations/20260227_create_component_ratings.sql`:

```sql
-- User ratings and mini-reviews for components
create table if not exists component_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  component_id integer not null,
  rating smallint not null check (rating between 1 and 5),
  review_text text check (char_length(review_text) <= 500),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, component_id)
);

create index idx_component_ratings_component on component_ratings(component_id);
create index idx_component_ratings_user on component_ratings(user_id);

-- Enable RLS
alter table component_ratings enable row level security;

-- Users can read all ratings
create policy "Anyone can read ratings" on component_ratings
  for select using (true);

-- Users can insert/update their own ratings
create policy "Users can insert own ratings" on component_ratings
  for insert with check (auth.uid() = user_id);

create policy "Users can update own ratings" on component_ratings
  for update using (auth.uid() = user_id);

create policy "Users can delete own ratings" on component_ratings
  for delete using (auth.uid() = user_id);
```

Run against Supabase: `npx supabase db push` (or apply via dashboard)

### Step 2: Create ratings API route

Create `src/app/api/components/[id]/ratings/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/components/[id]/ratings — aggregate + recent reviews
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params

  const [aggregateResult, reviewsResult] = await Promise.all([
    supabase
      .from('component_ratings')
      .select('rating')
      .eq('component_id', id),
    supabase
      .from('component_ratings')
      .select('rating, review_text, created_at')
      .eq('component_id', id)
      .not('review_text', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const ratings = aggregateResult.data || []
  const avg = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
    : 0

  return NextResponse.json({
    average: Math.round(avg * 10) / 10,
    count: ratings.length,
    distribution: [1, 2, 3, 4, 5].map(star => ({
      star,
      count: ratings.filter(r => r.rating === star).length,
    })),
    reviews: reviewsResult.data || [],
  })
}

// POST /api/components/[id]/ratings — upsert user rating
export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const body = await request.json()
  const { rating, review_text } = body

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 })
  }

  // Get user ID from email
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single()

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('component_ratings')
    .upsert({
      user_id: userData.id,
      component_id: parseInt(id),
      rating,
      review_text: review_text?.trim() || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,component_id',
    })
    .select()
    .single()

  if (error) {
    console.error('Rating upsert error:', error)
    return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

**Note:** Check how other API routes in this codebase resolve user IDs from next-auth sessions. The pattern above may need adjustment — look at `src/app/api/gear/` or `src/app/api/wishlist/` for the exact pattern.

### Step 3: Create StarRating component

Create `src/components/StarRating.tsx`:

```tsx
'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'

interface StarRatingProps {
  rating: number
  onRate?: (rating: number) => void
  size?: 'sm' | 'md'
  interactive?: boolean
}

export function StarRating({ rating, onRate, size = 'md', interactive = false }: StarRatingProps) {
  const [hovered, setHovered] = useState(0)
  const starSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <div className="flex gap-0.5" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            className={`${starSize} transition-colors ${
              star <= (hovered || rating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  )
}
```

### Step 4: Add ratings section to ComponentDetailModal

Modify `src/components/ComponentDetailModal.tsx`. Add between the sound signature section (line 260) and the footer `</div>` (line 261):

```tsx
// Add imports at top:
import { Star } from 'lucide-react'
import { StarRating } from './StarRating'

// Add state inside component (after marketData state):
const [ratings, setRatings] = useState<{
  average: number; count: number;
  reviews: { rating: number; review_text: string; created_at: string }[]
} | null>(null)
const [userRating, setUserRating] = useState(0)
const [reviewText, setReviewText] = useState('')
const [submitting, setSubmitting] = useState(false)

// Add fetch effect (after marketData effect):
useEffect(() => {
  if (!isOpen) return
  let cancelled = false
  fetch(`/api/components/${component.id}/ratings`)
    .then(res => res.json())
    .then(data => { if (!cancelled) setRatings(data) })
    .catch(() => {})
  return () => { cancelled = true }
}, [isOpen, component.id])

// Add submit handler:
const handleRatingSubmit = async (rating: number) => {
  setUserRating(rating)
  setSubmitting(true)
  try {
    await fetch(`/api/components/${component.id}/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, review_text: reviewText || undefined }),
    })
    // Refresh ratings
    const res = await fetch(`/api/components/${component.id}/ratings`)
    const data = await res.json()
    setRatings(data)
  } catch { /* silent fail */ }
  setSubmitting(false)
}

// JSX section (add after sound signature, before closing </div> of content):
{/* User Ratings */}
<div className="space-y-3">
  <div className="flex items-center gap-2">
    <Star className="w-5 h-5 text-accent" />
    <h3 className="font-semibold text-primary">Community Ratings</h3>
  </div>
  <div className="p-4 bg-secondary rounded-lg space-y-3">
    {ratings && ratings.count > 0 ? (
      <div className="flex items-center gap-3">
        <StarRating rating={Math.round(ratings.average)} />
        <span className="text-primary font-medium">{ratings.average}</span>
        <span className="text-sm text-secondary">from {ratings.count} user{ratings.count !== 1 ? 's' : ''}</span>
      </div>
    ) : (
      <p className="text-sm text-secondary">No ratings yet. Be the first!</p>
    )}
    {/* User rating input */}
    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
      <p className="text-sm text-secondary mb-2">Your rating:</p>
      <StarRating
        rating={userRating}
        onRate={handleRatingSubmit}
        interactive
      />
    </div>
    {/* Recent reviews */}
    {ratings?.reviews && ratings.reviews.length > 0 && (
      <div className="pt-2 space-y-2">
        {ratings.reviews.slice(0, 3).map((review, i) => (
          <div key={i} className="text-sm">
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} size="sm" />
              <span className="text-tertiary text-xs">
                {new Date(review.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-secondary mt-1">{review.review_text}</p>
          </div>
        ))}
      </div>
    )}
  </div>
</div>
```

### Step 5: Verify build

Run: `npm run build`
Expected: Clean build.

### Step 6: Commit

```bash
git add supabase/migrations/20260227_create_component_ratings.sql src/app/api/components/\[id\]/ratings/route.ts src/components/StarRating.tsx src/components/ComponentDetailModal.tsx
git commit -m "feat: add user ratings and mini-reviews on components (3.1)"
```

---

## Task 3: Popular Pairings (3.2)

### Context
- Computed from existing `stack_components` table — no new tables
- Show in ComponentDetailModal below ratings
- Fallback to category-based suggestions when stack data is sparse

### Step 1: Create pairings API route

Create `src/app/api/components/[id]/pairings/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const componentId = parseInt(id)

  // Find components that appear in the same stacks as this component
  const { data: coOccurrences } = await supabase.rpc('get_component_pairings', {
    target_component_id: componentId,
    result_limit: 5,
  })

  // If we have enough data from stacks, return it
  if (coOccurrences && coOccurrences.length >= 3) {
    return NextResponse.json({ pairings: coOccurrences, source: 'stacks' })
  }

  // Fallback: suggest popular components in complementary categories
  const { data: component } = await supabase
    .from('components')
    .select('category, price_new')
    .eq('id', componentId)
    .single()

  if (!component) {
    return NextResponse.json({ pairings: [], source: 'none' })
  }

  // Map category to complementary categories
  const complementary: Record<string, string[]> = {
    cans: ['dacs', 'amps', 'combo'],
    iems: ['dacs', 'combo'],
    dacs: ['amps', 'cans', 'iems'],
    amps: ['dacs', 'cans'],
    combo: ['cans', 'iems'],
  }

  const targetCategories = complementary[component.category] || []
  const priceRange = component.price_new || 200
  const minPrice = priceRange * 0.3
  const maxPrice = priceRange * 3

  const { data: suggestions } = await supabase
    .from('components')
    .select('id, name, brand, category, price_new, price_used_min, price_used_max')
    .in('category', targetCategories)
    .gte('price_new', minPrice)
    .lte('price_new', maxPrice)
    .order('crin_rank', { ascending: true, nullsFirst: false })
    .limit(5)

  return NextResponse.json({
    pairings: (suggestions || []).map(s => ({
      component_id: s.id,
      name: s.name,
      brand: s.brand,
      category: s.category,
      price_new: s.price_new,
      price_used_min: s.price_used_min,
      price_used_max: s.price_used_max,
    })),
    source: 'suggested',
  })
}
```

### Step 2: Create Supabase RPC function for co-occurrence query

Create `supabase/migrations/20260227_add_pairings_rpc.sql`:

```sql
create or replace function get_component_pairings(target_component_id integer, result_limit integer default 5)
returns table(
  component_id integer,
  name text,
  brand text,
  category text,
  price_new numeric,
  price_used_min numeric,
  price_used_max numeric,
  pair_count bigint
)
language sql stable
as $$
  select
    sc2.component_id,
    c.name,
    c.brand,
    c.category,
    c.price_new,
    c.price_used_min,
    c.price_used_max,
    count(*) as pair_count
  from stack_components sc1
  join stack_components sc2 on sc1.stack_id = sc2.stack_id
    and sc1.component_id is distinct from sc2.component_id
  join components c on c.id = sc2.component_id
  where sc1.component_id = target_component_id
    and sc2.component_id is not null
  group by sc2.component_id, c.name, c.brand, c.category, c.price_new, c.price_used_min, c.price_used_max
  order by pair_count desc
  limit result_limit;
$$;
```

### Step 3: Add pairings section to ComponentDetailModal

Add below the ratings section in `src/components/ComponentDetailModal.tsx`:

```tsx
// Add import:
import { Users } from 'lucide-react'

// Add state:
const [pairings, setPairings] = useState<{
  pairings: { component_id: number; name: string; brand: string; category: string; price_new: number; price_used_min: number; price_used_max: number }[];
  source: string;
} | null>(null)

// Add fetch effect:
useEffect(() => {
  if (!isOpen) return
  let cancelled = false
  fetch(`/api/components/${component.id}/pairings`)
    .then(res => res.json())
    .then(data => { if (!cancelled) setPairings(data) })
    .catch(() => {})
  return () => { cancelled = true }
}, [isOpen, component.id])

// JSX:
{pairings && pairings.pairings.length > 0 && (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Users className="w-5 h-5 text-accent" />
      <h3 className="font-semibold text-primary">
        {pairings.source === 'stacks' ? 'Often Paired With' : 'Suggested Pairings'}
      </h3>
    </div>
    <div className="space-y-2">
      {pairings.pairings.map(p => (
        <div key={p.component_id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
          <div>
            <span className="font-medium text-primary">{p.brand} {p.name}</span>
            <span className="ml-2 text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full">{p.category}</span>
          </div>
          <span className="text-sm text-secondary">
            {p.price_used_min && p.price_used_max
              ? `$${p.price_used_min}–$${p.price_used_max} used`
              : p.price_new ? `$${p.price_new} new` : ''}
          </span>
        </div>
      ))}
    </div>
  </div>
)}
```

### Step 4: Verify build

Run: `npm run build`

### Step 5: Commit

```bash
git add supabase/migrations/20260227_add_pairings_rpc.sql src/app/api/components/\[id\]/pairings/route.ts src/components/ComponentDetailModal.tsx
git commit -m "feat: add popular pairings section to component detail (3.2)"
```

---

## Task 4: Multi-Retailer Links (4.1)

### Context
- Currently: `amazon_url` field on components + eBay affiliate link generation in `src/lib/ebay-affiliate.ts`
- Goal: show "Where to Buy" section in ComponentDetailModal with multiple retailers
- No new DB table — generate search URLs dynamically from brand+name

### Step 1: Create retailer link generator

Create `src/lib/retailer-links.ts`:

```typescript
import { generateEbayAffiliateLink, generateTrackingId } from './ebay-affiliate'

interface RetailerLink {
  name: string
  url: string
  type: 'new' | 'used' | 'both'
  icon: string // Lucide icon name or emoji
}

interface ComponentInfo {
  id: string
  brand: string
  name: string
  category: 'cans' | 'iems' | 'dac' | 'amp' | 'dac_amp' | 'cable'
  amazon_url: string | null
}

export function getRetailerLinks(component: ComponentInfo): RetailerLink[] {
  const links: RetailerLink[] = []
  const searchQuery = encodeURIComponent(`${component.brand} ${component.name}`)

  // Amazon — use stored URL or generate search
  const amazonUrl = component.amazon_url
    || `https://www.amazon.com/s?k=${searchQuery}&tag=hifinder-20`
  links.push({
    name: 'Amazon',
    url: amazonUrl,
    type: 'new',
    icon: 'shopping-cart',
  })

  // eBay (used) — use existing affiliate link generator
  links.push({
    name: 'eBay',
    url: generateEbayAffiliateLink(
      { brand: component.brand, name: component.name, category: component.category },
      { customId: generateTrackingId(component.id, 'component_detail') }
    ),
    type: 'used',
    icon: 'tag',
  })

  // B&H Photo — audio equipment retailer
  links.push({
    name: 'B&H Photo',
    url: `https://www.bhphotovideo.com/c/search?q=${searchQuery}&filters=fct_category%3Aheadphones_accessories`,
    type: 'new',
    icon: 'camera',
  })

  // Drop — popular for audiophile gear
  if (['cans', 'iems', 'dacs', 'amps', 'combo'].includes(component.category)) {
    links.push({
      name: 'Drop',
      url: `https://drop.com/search/result?keyword=${searchQuery}`,
      type: 'new',
      icon: 'package',
    })
  }

  return links
}
```

### Step 2: Add "Where to Buy" section to ComponentDetailModal

Add to `src/components/ComponentDetailModal.tsx` after pairings section, before footer:

```tsx
// Add import:
import { ShoppingCart, Tag, Camera, Package as PackageIcon, ExternalLink } from 'lucide-react'
import { getRetailerLinks } from '@/lib/retailer-links'

// Compute inside component:
const retailerLinks = getRetailerLinks({
  id: component.id,
  brand: component.brand,
  name: component.name,
  category: component.category,
  amazon_url: component.amazon_url,
})

const retailerIcons: Record<string, React.ReactNode> = {
  'shopping-cart': <ShoppingCart className="w-4 h-4" />,
  'tag': <Tag className="w-4 h-4" />,
  'camera': <Camera className="w-4 h-4" />,
  'package': <PackageIcon className="w-4 h-4" />,
}

// JSX:
{/* Where to Buy */}
<div className="space-y-3">
  <div className="flex items-center gap-2">
    <ShoppingCart className="w-5 h-5 text-accent" />
    <h3 className="font-semibold text-primary">Where to Buy</h3>
  </div>
  <div className="grid grid-cols-2 gap-2">
    {retailerLinks.map(link => (
      <a
        key={link.name}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-3 bg-secondary rounded-lg hover:bg-tertiary transition-colors group"
      >
        {retailerIcons[link.icon]}
        <div className="flex-1 min-w-0">
          <span className="font-medium text-primary text-sm">{link.name}</span>
          <span className="ml-1.5 text-xs text-secondary">
            {link.type === 'new' ? 'New' : link.type === 'used' ? 'Used' : 'New & Used'}
          </span>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-tertiary group-hover:text-accent transition-colors" />
      </a>
    ))}
  </div>
</div>
```

### Step 3: Verify build

Run: `npm run build`

### Step 4: Commit

```bash
git add src/lib/retailer-links.ts src/components/ComponentDetailModal.tsx
git commit -m "feat: add multi-retailer 'Where to Buy' links in component detail (4.1)"
```

---

## Task 5: Gear Upgrade Advisor (4.3)

### Context
- Skeleton exists in `src/lib/gear.ts:211-255` — basic amp/DAC detection only
- Dashboard overview tab at `src/app/dashboard/page.tsx:305-318` — insert after OnboardingChecklist
- Needs: tier upgrades, bottleneck detection, budget-aware suggestions

### Step 1: Expand getUpgradeSuggestions in gear.ts

Modify `src/lib/gear.ts`. Replace the existing `getUpgradeSuggestions` function (lines 204-255) and `GearSuggestion` interface:

```typescript
export interface GearSuggestion {
  type: 'missing_amp' | 'missing_dac' | 'tier_upgrade' | 'bottleneck'
  priority: 'high' | 'medium' | 'low'
  message: string
  currentItem?: { brand: string; name: string; price: number | null; category: string }
  suggestedItems?: { id: string; brand: string; name: string; category: string; price_new: number | null; price_used_min: number | null; price_used_max: number | null }[]
}

export async function getUpgradeSuggestions(userId: string): Promise<GearSuggestion[]> {
  const gear = await getUserGear(userId)
  if (gear.length === 0) return []

  const suggestions: GearSuggestion[] = []

  const headphones = gear.filter(g => g.components?.category === 'cans' || g.components?.category === 'iems')
  const dacs = gear.filter(g => g.components?.category === 'dacs' || g.components?.category === 'combo')
  const amps = gear.filter(g => g.components?.category === 'amps' || g.components?.category === 'combo')

  // 1. Missing amp for high-impedance headphones
  const highImpedance = headphones.filter(h => h.components?.impedance && h.components.impedance > 80)
  if (highImpedance.length > 0 && amps.length === 0) {
    const { data: suggestedAmps } = await supabase
      .from('components')
      .select('id, brand, name, category, price_new, price_used_min, price_used_max')
      .in('category', ['amps', 'combo'])
      .order('crin_rank', { ascending: true, nullsFirst: false })
      .limit(3)

    suggestions.push({
      type: 'missing_amp',
      priority: 'high',
      message: `Your ${highImpedance[0].components?.brand} ${highImpedance[0].components?.name} (${highImpedance[0].components?.impedance}Ω) would benefit from a dedicated amplifier`,
      suggestedItems: suggestedAmps || [],
    })
  }

  // 2. Missing DAC
  if (dacs.length === 0 && gear.length > 0) {
    const { data: suggestedDacs } = await supabase
      .from('components')
      .select('id, brand, name, category, price_new, price_used_min, price_used_max')
      .in('category', ['dacs', 'combo'])
      .order('crin_rank', { ascending: true, nullsFirst: false })
      .limit(3)

    suggestions.push({
      type: 'missing_dac',
      priority: 'medium',
      message: 'Adding a DAC would improve sound quality from your digital sources',
      suggestedItems: suggestedDacs || [],
    })
  }

  // 3. Tier upgrade — suggest next price tier for headphones
  for (const hp of headphones.slice(0, 2)) {
    const currentPrice = hp.purchase_price || hp.components?.price_new || 0
    if (currentPrice <= 0) continue

    const nextTierMin = currentPrice * 1.5
    const nextTierMax = currentPrice * 3

    const { data: upgrades } = await supabase
      .from('components')
      .select('id, brand, name, category, price_new, price_used_min, price_used_max')
      .eq('category', hp.components?.category || 'cans')
      .gte('price_new', nextTierMin)
      .lte('price_new', nextTierMax)
      .order('crin_rank', { ascending: true, nullsFirst: false })
      .limit(3)

    if (upgrades && upgrades.length > 0) {
      suggestions.push({
        type: 'tier_upgrade',
        priority: 'low',
        message: `Ready to step up from your ${hp.components?.brand} ${hp.components?.name}?`,
        currentItem: {
          brand: hp.components?.brand || '',
          name: hp.components?.name || '',
          price: currentPrice,
          category: hp.components?.category || 'cans',
        },
        suggestedItems: upgrades,
      })
    }
  }

  // 4. Bottleneck detection — expensive headphones with budget source gear
  const maxHpPrice = Math.max(...headphones.map(h => h.purchase_price || h.components?.price_new || 0))
  const maxSourcePrice = Math.max(
    ...dacs.map(d => d.purchase_price || d.components?.price_new || 0),
    ...amps.map(a => a.purchase_price || a.components?.price_new || 0),
    0
  )

  if (maxHpPrice > 300 && maxSourcePrice > 0 && maxSourcePrice < maxHpPrice * 0.3) {
    const targetPrice = maxHpPrice * 0.3
    const { data: betterSources } = await supabase
      .from('components')
      .select('id, brand, name, category, price_new, price_used_min, price_used_max')
      .in('category', ['dacs', 'combo'])
      .gte('price_new', targetPrice * 0.5)
      .lte('price_new', targetPrice * 2)
      .order('crin_rank', { ascending: true, nullsFirst: false })
      .limit(3)

    if (betterSources && betterSources.length > 0) {
      suggestions.push({
        type: 'bottleneck',
        priority: 'medium',
        message: 'Your source gear may be holding back your headphones — consider upgrading your DAC',
        suggestedItems: betterSources,
      })
    }
  }

  return suggestions
}
```

### Step 2: Create upgrade suggestions API route

Create `src/app/api/user/upgrade-suggestions/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getUpgradeSuggestions } from '@/lib/gear'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Resolve user ID — follow same pattern as other dashboard API routes
  // Check src/app/api/user/dashboard/stats/route.ts for the exact user ID resolution
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single()

  if (!user) {
    return NextResponse.json({ suggestions: [] })
  }

  const suggestions = await getUpgradeSuggestions(user.id)
  return NextResponse.json({ suggestions })
}
```

### Step 3: Create UpgradeAdvisor dashboard component

Create `src/components/dashboard/UpgradeAdvisor.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, ChevronRight, Zap, Cpu, ArrowUpRight } from 'lucide-react'
import type { GearSuggestion } from '@/lib/gear'

const typeIcons: Record<string, React.ReactNode> = {
  missing_amp: <Zap className="w-5 h-5 text-amber-500" />,
  missing_dac: <Cpu className="w-5 h-5 text-blue-500" />,
  tier_upgrade: <ArrowUpRight className="w-5 h-5 text-green-500" />,
  bottleneck: <TrendingUp className="w-5 h-5 text-orange-500" />,
}

export function UpgradeAdvisor() {
  const [suggestions, setSuggestions] = useState<GearSuggestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/upgrade-suggestions')
      .then(res => res.json())
      .then(data => setSuggestions(data.suggestions || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || suggestions.length === 0) return null

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-semibold text-foreground">Upgrade Suggestions</h3>
      </div>
      <div className="space-y-3">
        {suggestions.map((suggestion, i) => (
          <div key={i} className="p-4 border border-border rounded-lg">
            <div className="flex items-start gap-3">
              {typeIcons[suggestion.type]}
              <div className="flex-1">
                <p className="text-foreground font-medium">{suggestion.message}</p>
                {suggestion.suggestedItems && suggestion.suggestedItems.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {suggestion.suggestedItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">
                          {item.brand} {item.name}
                        </span>
                        <span className="text-muted">
                          {item.price_used_min && item.price_used_max
                            ? `$${item.price_used_min}–$${item.price_used_max} used`
                            : item.price_new ? `$${item.price_new} new` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted flex-shrink-0 mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Step 4: Add UpgradeAdvisor to dashboard overview

Modify `src/app/dashboard/page.tsx`. Add import and render after WishlistMatches (line 309):

```tsx
// Add import at top:
import { UpgradeAdvisor } from '@/components/dashboard/UpgradeAdvisor'

// Add after WishlistMatches (line 309), before RecentSearches:
<UpgradeAdvisor />
```

### Step 5: Verify build

Run: `npm run build`

### Step 6: Commit

```bash
git add src/lib/gear.ts src/app/api/user/upgrade-suggestions/route.ts src/components/dashboard/UpgradeAdvisor.tsx src/app/dashboard/page.tsx
git commit -m "feat: add gear upgrade advisor to dashboard (4.3)"
```

---

## Final Step: Update PRD Checkboxes

After all 5 features are implemented, update `docs/PRD-missing-features.md`:
- Check off 2.3 Social Sharing
- Check off 3.1 User Ratings
- Check off 3.2 Popular Pairings
- Check off 4.1 Buy Now Price Comparison
- Check off 4.3 Gear Upgrade Path

Commit:
```bash
git add docs/PRD-missing-features.md
git commit -m "docs: mark P2 features complete in PRD"
```

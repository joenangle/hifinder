# P2 Features Design — Social, Ratings, Pairings, Retailers, Upgrades

**Date:** 2026-02-27
**Status:** Approved
**Source:** PRD-missing-features.md (remaining P2 items, email deferred)

---

## Scope

5 features, all building on existing infrastructure:

1. **2.3 Social Sharing** (finish) — OG tags + share buttons
2. **3.1 User Ratings & Mini-Reviews** — new DB table + UI
3. **3.2 Popular Pairings** — computed from existing stack data
4. **4.1 Multi-Retailer Links** — expand beyond eBay
5. **4.3 Gear Upgrade Advisor** — expand skeleton + dashboard UI

---

## 2.3 Social Sharing (Finish)

**What exists:** Clipboard URL copy in StackBuilderModal (budget + component IDs in URL).

**What to add:**

1. **Dynamic OG metadata** in `/recommendations/page.tsx`:
   - `generateMetadata()` reads `budget` and `components` searchParams
   - Fetches component names from DB for title/description
   - Title: "HiFinder Stack: HD650 + Schiit Modi + JDS Atom — $450"
   - Description: summary of the stack
   - Static OG image (hifinder logo/brand card) — dynamic generation deferred

2. **Share buttons** in StackBuilderModal:
   - Web Share API (native share sheet on mobile, feature-detect first)
   - Fallback: Twitter, Reddit, copy-to-clipboard buttons
   - Toast feedback on clipboard copy (currently silent)

3. **Public stack view** (stretch): `/stacks/[id]` read-only page — deferred to P3.

**Files touched:**
- `src/app/recommendations/page.tsx` (add generateMetadata)
- `src/components/StackBuilderModal.tsx` (share buttons)
- Add a small `ShareButtons` component

---

## 3.1 User Ratings & Mini-Reviews

**New DB table:**
```sql
create table component_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  component_id integer references components(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  review_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, component_id)
);

create index idx_component_ratings_component on component_ratings(component_id);
```

**API:** `GET/POST /api/components/[id]/ratings`
- GET: returns aggregate (avg, count) + recent reviews
- POST: upsert user's rating (authenticated)

**UI in ComponentDetailModal:**
- Star rating display (aggregate): "4.2 from 12 users"
- Interactive star input for logged-in users (tap to rate)
- Optional review text field (1-2 sentences)
- List of recent mini-reviews below

**Files touched:**
- New migration file
- New API route: `src/app/api/components/[id]/ratings/route.ts`
- `src/components/ComponentDetailModal.tsx` (new section)
- New component: `src/components/StarRating.tsx`

---

## 3.2 Popular Pairings

**No new tables needed.** Computed from existing `stack_components` and `user_gear` data.

**Query logic:**
```sql
-- Given component X, find components most frequently co-occurring in stacks
select sc2.component_id, c.name, c.brand, c.category, count(*) as pair_count
from stack_components sc1
join stack_components sc2 on sc1.stack_id = sc2.stack_id
  and sc1.component_id != sc2.component_id
join components c on c.id = sc2.component_id
where sc1.component_id = $target_id
group by sc2.component_id, c.name, c.brand, c.category
order by pair_count desc
limit 5;
```

**Fallback:** If fewer than 3 pairings from user data, supplement with category-based suggestions (e.g., "Popular DACs in this price range").

**API:** `GET /api/components/[id]/pairings`

**UI in ComponentDetailModal:**
- "Often paired with" section showing top 3-5 items
- Each item: name, brand, category badge, price
- Clickable to open that component's detail modal

**Files touched:**
- New API route: `src/app/api/components/[id]/pairings/route.ts`
- `src/components/ComponentDetailModal.tsx` (new section)

---

## 4.1 Multi-Retailer Links

**Approach:** Add retailer data to components rather than a separate table. Use a JSONB column for flexibility.

**DB change:**
```sql
alter table components add column retailer_links jsonb default '[]';
-- Format: [{"name": "Amazon", "url": "...", "affiliate": true}, ...]
```

Migrate existing `amazon_url` values into `retailer_links` array. Keep `amazon_url` column for backward compatibility initially.

**Seed data:** For now, auto-generate retailer search URLs:
- Amazon: existing `amazon_url` or search link
- eBay: use existing `ebay-affiliate.ts` logic
- B&H Photo: search URL pattern
- Drop: search URL pattern (for relevant brands)

**UI in ComponentDetailModal:**
- "Where to Buy" section with retailer buttons
- Each button: retailer logo/icon + "New" or "Used" badge + price if known
- Click tracking via `/api/clicks` (simple insert: component_id, retailer, timestamp)

**Files touched:**
- New migration file
- `src/components/ComponentDetailModal.tsx` (new section)
- New component: `src/components/RetailerLinks.tsx`
- Optional: `src/app/api/clicks/route.ts` for tracking

---

## 4.3 Gear Upgrade Advisor

**Existing code:** `getUpgradeSuggestions()` in `src/lib/gear.ts` (lines 211-255) has basic logic for detecting missing amp/DAC.

**Expanded logic:**
1. **Missing category detection:** User has headphones but no DAC → suggest entry DACs
2. **Tier upgrade:** User has $100 headphone → suggest $200-300 tier options
3. **Bottleneck detection:** High-end headphones with budget DAC → suggest DAC upgrade
4. **Budget-aware:** Suggestions respect a reasonable step-up (1.5-2x current tier)

**Data model:** No new tables. Compute from `user_gear` joined with `components` table. Use price tiers and category matching.

**API:** `GET /api/user/upgrade-suggestions`

**UI:** New `UpgradeAdvisor.tsx` component on dashboard overview tab:
- Card per suggestion: "Your HD560S → HD650 ($180 used, ~$100 step-up)"
- Category badge, price delta, brief reason
- Link to component detail modal + affiliate links

**Files touched:**
- `src/lib/gear.ts` (expand getUpgradeSuggestions)
- New API route: `src/app/api/user/upgrade-suggestions/route.ts`
- New component: `src/components/dashboard/UpgradeAdvisor.tsx`
- `src/app/dashboard/page.tsx` (add to overview tab)

---

## Implementation Order

1. **Social sharing** (2.3) — lowest risk, independent
2. **User ratings** (3.1) — new table needed, foundation for other features
3. **Popular pairings** (3.2) — depends on having stack data, benefits from ratings existing
4. **Multi-retailer links** (4.1) — independent, high monetization value
5. **Upgrade advisor** (4.3) — depends on gear data understanding, benefits from retailer links

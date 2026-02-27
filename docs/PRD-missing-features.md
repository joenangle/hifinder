# HiFinder — Missing Features PRD

**Date:** 2026-02-26
**Status:** Draft
**Author:** Claude (for Joe)

---

## Executive Summary

HiFinder has a strong foundation: a smart recommendations engine, marketplace aggregation, gear collection management, stack building, and price alerts. The gaps fall into four categories:

1. **Dashboard polish** — features that exist but feel incomplete or disconnected
2. **Engagement loops** — features that bring users back (notifications, sharing, activity feeds)
3. **Social proof & community** — user-generated content that builds trust and reduces decision anxiety
4. **Monetization amplifiers** — features that increase affiliate click-through and time-on-site

This PRD prioritizes by **impact × effort**, focusing on what will make the logged-in experience feel complete and sticky.

---

## 1. Dashboard & Logged-In Experience Gaps

### 1.1 Recent Activity Feed (Overview Tab)

**Problem:** The overview tab shows "No recent activity" — a dead-end for returning users.

**Solution:** Surface a timeline of user actions and relevant events:
- Gear added/removed from collection
- Wishlist items with price changes
- New used listings matching owned gear or wishlist
- Stack modifications
- Price alert triggers

**Data sources:** Already available — user_gear, wishlists, alert_history, used_listings tables.

**Effort:** Medium (1-2 days)
**Impact:** High — gives returning users an immediate reason to engage.

### 1.2 Account Settings Page

**Problem:** No `/settings` or `/account` page. Users can't customize preferences, delete their account, or manage notification preferences.

**Solution:** Create `/dashboard?tab=settings` or `/settings` with:
- Display name / avatar (from Google, read-only or editable)
- Default budget range preference
- Sound signature preference (persisted, auto-applied to recommendations)
- Email notification preferences (when email is implemented)
- Currency preference (USD default, but some users are international)
- Account deletion (GDPR compliance, self-service)
- Connected accounts (Google, future: Discord, Head-Fi)

**Effort:** Medium (1-2 days)
**Impact:** Medium — trust signal, GDPR readiness, UX polish.

### 1.3 Depreciation & Value Tracking

**Problem:** Dashboard shows "$0 depreciation" — the feature exists in the stats API but returns placeholder data.

**Solution:** Calculate depreciation using:
- `purchase_price` from user_gear
- Current `price_used_min`/`price_used_max` from components table
- Formula: `depreciation = purchase_price - avg(price_used_min, price_used_max)`

Show as a card in the overview tab: "Your collection is worth ~$X (↓$Y from purchase)".

**Effort:** Low (2-4 hours)
**Impact:** Medium — interesting insight that makes gear tracking feel alive.

### 1.4 Saved Recommendation Sessions

**Problem:** Users can't save or revisit past recommendation queries. Every visit starts from scratch.

**Solution:**
- Auto-save the last 5 recommendation URLs (budget, filters, selections) to localStorage or DB
- Show "Recent Searches" section on dashboard overview
- Allow naming/bookmarking a recommendation session
- "Share this search" button that copies the URL

**Effort:** Low-Medium (1 day)
**Impact:** High — reduces friction for returning users who want to continue exploring.

### 1.5 Alert History Modal (Stubbed Out)

**Problem:** The price alerts tab has history modal functionality commented out (AlertsTab.tsx, lines 369-378).

**Solution:** Implement the modal that was already designed:
- Show past trigger events with listing details
- Link to original listing
- Mark as viewed/dismissed
- Filter by alert

**Effort:** Low (2-4 hours — the data and API already exist)
**Impact:** Medium — completes an existing feature.

---

## 2. Engagement & Retention Features

### 2.1 Email Notifications

**Problem:** Price alerts only work when the user is on the site. There's no way to notify users of price drops, new listings matching their wishlist, or market movement.

**Solution:** Implement email digests using Resend (or SendGrid):
- **Instant:** Price alert triggered (listing matches user's criteria)
- **Daily digest (opt-in):** New listings matching wishlist items
- **Weekly digest (opt-in):** Market summary for owned gear category

**Implementation:**
- Add email preferences to user settings
- Create email templates (React Email or similar)
- Add email sending to the existing alert checking pipeline
- Unsubscribe link in every email

**Effort:** High (3-5 days)
**Impact:** Very High — the #1 feature that drives return visits on every recommendation platform.

### 2.2 Wishlist ↔ Marketplace Auto-Match

**Problem:** Users add items to their wishlist but there's no proactive "hey, this item from your wishlist is available on the used market right now" notification.

**Solution:**
- When scraper finds new listings, cross-reference with all users' wishlists
- Surface matches in dashboard overview ("2 wishlist items available used!")
- Show badge on wishlist tab with match count
- Optional: email notification (ties into 2.1)

**Effort:** Medium (1-2 days)
**Impact:** High — directly connects two existing features into a powerful loop.

### 2.3 Social Sharing

**Problem:** No way to share recommendations, stacks, or comparison results with friends.

**Solution:**
- "Share" button on recommendation results page (copies URL — already works since state is in URL)
- "Share Stack" button that generates a public read-only stack view (`/stacks/[id]`)
- Open Graph meta tags for shared URLs (title, description, image preview)
- Share to clipboard / Twitter / Reddit / Discord

**Effort:** Medium (1-2 days)
**Impact:** Medium-High — organic growth channel, common request in audio communities.

### 2.4 Onboarding Checklist

**Problem:** New authenticated users land on an empty dashboard with no guidance.

**Solution:** Show a progress checklist that disappears when complete:
- [ ] Set your budget (link to recommendations)
- [ ] Add your first headphone to your collection
- [ ] Create your first stack
- [ ] Save an item to your wishlist
- [ ] Set up a price alert

Reward: confetti animation or "Setup Complete" badge.

**Effort:** Low (4-6 hours)
**Impact:** Medium — reduces first-session drop-off.

---

## 3. Social Proof & Community Features

### 3.1 User Ratings & Mini-Reviews

**Problem:** All expert analysis comes from Crinacle and ASR. There's no way for users to share their own experience with a component.

**Solution:**
- 5-star rating on component detail modal (quick tap)
- Optional 1-2 sentence mini-review
- Aggregate: "4.2 stars from 12 HiFinder users"
- Show on recommendation cards when available

**Database:** New `user_reviews` table: `id, user_id, component_id, rating (1-5), review_text, created_at`

**Effort:** Medium (2-3 days)
**Impact:** High — social proof is the #1 trust signal for product decisions.

### 3.2 "What Others Bought" / Popular Pairings

**Problem:** Users don't know what other people with similar preferences ended up buying.

**Solution:**
- Analyze user_gear and stack_components data
- Show: "Users who own HD650 also own: Schiit Modi (45%), JDS Atom (32%)..."
- Show popular stacks in the category: "Most popular $500 desktop setups"
- Surface on recommendation cards and component detail modal

**Effort:** Medium (2-3 days)
**Impact:** High — reduces decision paralysis, increases confidence.

### 3.3 Community Tier Lists

**Problem:** No user-driven rankings. All rankings are algorithmic.

**Solution:**
- Let users vote on "Best headphone under $200" type lists
- Pre-seed with algorithm results
- Show community rank alongside Crinacle rank
- Monthly/quarterly refresh

**Effort:** High (3-5 days)
**Impact:** Medium — strong SEO value, community engagement.

---

## 4. Monetization Amplifiers

### 4.1 "Buy Now" Price Comparison

**Problem:** Users see used price estimates but have no direct path to buy new from retailers (beyond a single Amazon link).

**Solution:**
- Integrate multiple affiliate programs (Amazon, B&H Photo, Sweetwater, Drop)
- Show a "Where to Buy" section in component detail modal
- Compare prices across retailers
- Track click-throughs per source

**Effort:** Medium (2-3 days per retailer)
**Impact:** Very High — directly increases affiliate revenue.

### 4.2 Deal Alerts Email

**Problem:** "Hot deals" on the marketplace page are only visible when the user visits.

**Solution:**
- Daily "Deal of the Day" email to opted-in users
- Feature 3-5 best deals (highest discount from market value)
- Include affiliate links for new alternatives
- Ties into email notification system (2.1)

**Effort:** Low (once email infra exists)
**Impact:** High — direct revenue driver.

### 4.3 Gear Upgrade Path

**Problem:** No guidance for "I have X, what should I upgrade to next?"

**Solution:**
- "Upgrade Advisor" feature on dashboard
- Analyze user's current gear → suggest next-tier upgrades
- "Your HD560S → next step: HD650 ($180 used) or Sundara ($250 used)"
- Show price difference and expected improvement
- Affiliate links to buy recommendations

**Effort:** Medium (2-3 days)
**Impact:** High — unique feature, strong monetization alignment.

---

## 5. Technical & Infrastructure

### 5.1 PWA / Mobile Experience

**Problem:** The site is responsive but not installable. Audio enthusiasts often browse on mobile.

**Solution:**
- Add service worker + manifest.json
- Offline support for dashboard and saved stacks
- Push notifications (alternative to email for mobile users)
- "Add to Home Screen" prompt

**Effort:** Medium (2-3 days)
**Impact:** Medium — improves mobile retention.

### 5.2 Public API

**Problem:** Audio content creators (YouTubers, bloggers) can't integrate HiFinder data.

**Solution:**
- Public read-only API for component specs, rankings, pricing
- Rate-limited (100 req/hour free tier)
- API key registration
- Documentation page

**Effort:** High (1 week)
**Impact:** Medium-Long term — ecosystem play, brand building.

---

## Priority Matrix

| Feature | Effort | Impact | Priority |
|---------|--------|--------|----------|
| 1.5 Alert History Modal | Low | Medium | **P0** — finish existing stub |
| 1.3 Depreciation Tracking | Low | Medium | **P0** — fix placeholder |
| 1.1 Recent Activity Feed | Medium | High | **P1** |
| 1.4 Saved Recommendation Sessions | Low-Med | High | **P1** |
| 2.2 Wishlist ↔ Marketplace Match | Medium | High | **P1** |
| 2.4 Onboarding Checklist | Low | Medium | **P1** |
| 2.1 Email Notifications | High | Very High | **P2** (infra investment) |
| 2.3 Social Sharing | Medium | Medium-High | **P2** |
| 3.1 User Ratings & Reviews | Medium | High | **P2** |
| 3.2 Popular Pairings | Medium | High | **P2** |
| 4.1 Buy Now Price Comparison | Medium | Very High | **P2** |
| 4.3 Gear Upgrade Path | Medium | High | **P2** |
| 1.2 Account Settings | Medium | Medium | **P3** |
| 4.2 Deal Alerts Email | Low | High | **P3** (after email infra) |
| 3.3 Community Tier Lists | High | Medium | **P3** |
| 5.1 PWA | Medium | Medium | **P3** |
| 5.2 Public API | High | Medium | **P4** |

---

## Recommended Implementation Order

### Sprint 1: Complete What's Started (1-2 days)
- [ ] Fix depreciation calculation (1.3)
- [ ] Implement alert history modal (1.5)
- [ ] Add onboarding checklist for new users (2.4)

### Sprint 2: Dashboard Comes Alive (2-3 days)
- [ ] Build recent activity feed (1.1)
- [ ] Saved recommendation sessions (1.4)
- [ ] Wishlist ↔ marketplace auto-match (2.2)

### Sprint 3: Social & Sharing (3-4 days)
- [ ] Social sharing (stack URLs, OG tags) (2.3)
- [ ] User ratings on components (3.1)
- [ ] Popular pairings data (3.2)

### Sprint 4: Revenue & Growth (1 week)
- [ ] Email notification infrastructure (2.1)
- [ ] Buy now price comparison (4.1)
- [ ] Gear upgrade advisor (4.3)
- [ ] Deal alerts email (4.2)

### Sprint 5: Polish & Settings (1 week)
- [ ] Account settings page (1.2)
- [ ] Community tier lists (3.3)
- [ ] PWA support (5.1)

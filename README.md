# HiFinder

Audio gear recommendations at [hifinder.app](https://hifinder.app). Tell it
your budget, sound preference and what you already own, and it builds a
matched headphone or IEM system (DAC, amp, or a portable combo), backed by
expert measurements and live used-market prices. A stereo builder at
`/stereo` checks speaker and amp pairings.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase
(Postgres + RLS), NextAuth (Google sign-in), Resend, Vercel.

## Local development

```bash
cp .env.example .env.local   # fill in values
npm install
npm run dev                  # http://localhost:3002
```

| Command | What it does |
|---|---|
| `npm test` | Unit tests (Vitest) |
| `npm run type-check` / `npm run lint` | Type and lint checks (also run by the pre-commit hook) |
| `npm run build` | Production build (also run by the pre-push hook) |
| `npm run eval:reco` | Score recommendation quality against the live catalog |
| `npm run db "SELECT ..."` | Query the database directly (needs DB credentials) |

## Where things live

- `src/app/api/recommendations/v2/route.ts`: the recommendation engine
- `src/lib/`: domain logic (power matching, stereo math, scoring helpers)
- `scripts/`: scrapers, data imports and maintenance; `scripts/archive/` is history
- `docs/`: design notes and runbooks
- `CLAUDE.md`: the detailed engineering notes (scoring weights, data pipelines, deploy flow)

## Deployment

Vercel deploys `main` to production and `staging` to staging.hifinder.app.
Every other branch gets a protected preview.

-- Reddit social review data: mentions + scraper state tracking
-- Captures product mentions from discussion subreddits (r/headphones, r/headphoneadvice, etc.)

-- Table: reddit_mentions
-- Stores individual component mentions found in Reddit posts/comments
CREATE TABLE IF NOT EXISTS reddit_mentions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id        uuid REFERENCES components(id),
  reddit_post_id      text NOT NULL,
  reddit_comment_id   text,
  subreddit           text NOT NULL,
  post_type           text,            -- 'review', 'recommendation_request', 'comparison', 'discussion'
  mention_context     text NOT NULL,   -- ~200 chars around mention
  mention_location    text NOT NULL,   -- 'title', 'selftext', 'comment'
  post_title          text NOT NULL,
  post_url            text NOT NULL,
  post_score          integer,
  comment_score       integer,
  author              text,
  post_created_utc    timestamptz NOT NULL,
  collected_at        timestamptz DEFAULT now(),
  match_confidence    real,
  -- Future LLM analysis columns (nullable, populated later)
  sentiment           text,
  sentiment_score     real,
  is_recommendation   boolean,
  analyzed_at         timestamptz
);

-- Unique constraint: one mention per (post, comment, component) combo
-- Uses COALESCE to handle NULL reddit_comment_id for title/selftext mentions
CREATE UNIQUE INDEX IF NOT EXISTS idx_mentions_unique
  ON reddit_mentions(reddit_post_id, COALESCE(reddit_comment_id, ''), component_id);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_mentions_component_date ON reddit_mentions(component_id, post_created_utc DESC);
CREATE INDEX IF NOT EXISTS idx_mentions_subreddit_date ON reddit_mentions(subreddit, post_created_utc DESC);
CREATE INDEX IF NOT EXISTS idx_mentions_post_id ON reddit_mentions(reddit_post_id);

-- Table: reddit_scraper_state
-- Tracks which posts have been processed to avoid re-scanning
CREATE TABLE IF NOT EXISTS reddit_scraper_state (
  reddit_post_id      text PRIMARY KEY,
  subreddit           text NOT NULL,
  post_created_utc    timestamptz NOT NULL,
  post_score          integer,
  comment_count       integer,
  post_type           text,
  title_scanned       boolean DEFAULT false,
  comments_scanned    boolean DEFAULT false,
  first_seen_at       timestamptz DEFAULT now(),
  last_checked_at     timestamptz DEFAULT now()
);

-- Enable RLS (service-role-only writes)
ALTER TABLE reddit_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reddit_scraper_state ENABLE ROW LEVEL SECURITY;

-- Read-only for anon/authenticated, full access for service role
CREATE POLICY "Allow public read access on reddit_mentions"
  ON reddit_mentions FOR SELECT
  USING (true);

CREATE POLICY "Allow service role full access on reddit_mentions"
  ON reddit_mentions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access on reddit_scraper_state"
  ON reddit_scraper_state FOR ALL
  USING (auth.role() = 'service_role');

-- Email subscribers for lead capture (newsletter + guide downloads)
CREATE TABLE IF NOT EXISTS public.email_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK (source IN ('feature_card_guide', 'bottom_cta_newsletter')),
  confirmed BOOLEAN DEFAULT false,
  confirmation_token UUID DEFAULT gen_random_uuid(),
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_subscribers_token ON public.email_subscribers(confirmation_token);
CREATE INDEX idx_email_subscribers_email ON public.email_subscribers(email);

ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;
-- No public policies — all access through supabaseAdmin in API routes

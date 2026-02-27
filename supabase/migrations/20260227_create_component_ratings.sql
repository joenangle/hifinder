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

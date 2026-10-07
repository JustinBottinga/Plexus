-- Cards can later be shared in a public library; private by default
alter table public.cards add column if not exists is_public boolean not null default false;

-- Spaced repetition state per card and user
create table if not exists public.reviews (
  card_id uuid not null references public.cards(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  ease_factor real not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  due_date date not null default current_date,
  last_reviewed timestamptz,
  primary key (card_id, user_id)
);
grant select, insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
drop policy if exists "own reviews" on public.reviews;
create policy "own reviews" on public.reviews for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists reviews_user_due_idx on public.reviews(user_id, due_date);

-- Log of every rating given in study mode (feeds the dashboard in a later phase)
create table if not exists public.review_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  rating text not null check (rating in ('again', 'hard', 'good', 'easy')),
  direction text not null check (direction in ('image', 'location')),
  reviewed_at timestamptz not null default now()
);
grant select, insert, update, delete on public.review_log to authenticated;
grant all on public.review_log to service_role;
alter table public.review_log enable row level security;
drop policy if exists "own review log" on public.review_log;
create policy "own review log" on public.review_log for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists review_log_user_time_idx on public.review_log(user_id, reviewed_at);
create index if not exists review_log_card_idx on public.review_log(card_id);
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
create policy "own review log" on public.review_log for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists review_log_user_time_idx on public.review_log(user_id, reviewed_at);
create index if not exists review_log_card_idx on public.review_log(card_id);

-- Already created in 0001; kept here so phase 2 does not depend on remembering that
create index if not exists reviews_user_due_idx on public.reviews(user_id, due_date);

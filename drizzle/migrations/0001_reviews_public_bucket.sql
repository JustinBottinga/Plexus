-- Private storage bucket for card images (idempotent; policies live in 0000)
insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', false)
on conflict (id) do nothing;

-- Cards can later be shared in a public library; private by default
alter table public.cards add column if not exists is_public boolean not null default false;

-- Spaced repetition state per card and user (unused in phase 1)
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
create policy "own reviews" on public.reviews for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists reviews_user_due_idx on public.reviews(user_id, due_date);

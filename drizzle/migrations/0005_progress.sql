-- Dashboard and progress tracking: everything is aggregated here, so the client never loads whole tables.
-- All functions run as the caller (security invoker), so row level security applies, and each one also
-- filters on auth.uid() explicitly. Day boundaries use the time zone the client passes in (p_tz).
-- review_log already has an index on (user_id, reviewed_at) from 0002 (review_log_user_time_idx).
-- Each function body is a single-quoted string without a semicolon inside, so SQL editors that split a script
-- on semicolons (and do not understand dollar-quoting) still send every statement whole.

alter table public.profiles add column if not exists daily_goal integer not null default 20;
alter table public.profiles drop constraint if exists profiles_daily_goal_range;
alter table public.profiles add constraint profiles_daily_goal_range check (daily_goal between 5 and 100);

-- Reviews per local day and category: feeds the reviews chart, the heatmap, the mood faces and the home dots
create or replace function public.daily_review_counts(p_days integer default 30, p_tz text default 'UTC')
returns table (day date, category_id uuid, reviews integer, good integer)
language sql stable set search_path = public as '
  select
    (l.reviewed_at at time zone p_tz)::date,
    c.category_id,
    count(*)::integer,
    (count(*) filter (where l.rating in (''good'', ''easy'')))::integer
  from public.review_log l
  join public.cards c on c.id = l.card_id
  where l.user_id = auth.uid()
    and l.reviewed_at >= ((((now() at time zone p_tz)::date) - (least(greatest(p_days, 1), 400) - 1))::timestamp at time zone p_tz)
  group by 1, 2
  order by 1
';

-- Current and longest streak, and the reviews done today. A streak is alive when the last practice day is
-- today or yesterday.
create or replace function public.streak_stats(p_tz text default 'UTC')
returns table (current_streak integer, longest_streak integer, reviewed_today integer, total_reviews bigint)
language sql stable set search_path = public as '
  with t as (select (now() at time zone p_tz)::date as today),
  days as (
    select distinct (reviewed_at at time zone p_tz)::date as d from public.review_log where user_id = auth.uid()
  ),
  runs as (select d, d - (row_number() over (order by d))::integer as grp from days),
  islands as (select max(d) as last_day, count(*)::integer as n from runs group by grp)
  select
    coalesce((select n from islands, t where last_day >= t.today - 1 order by last_day desc limit 1), 0),
    coalesce((select max(n) from islands), 0),
    (select count(*)::integer from public.review_log l, t
       where l.user_id = auth.uid() and (l.reviewed_at at time zone p_tz)::date = t.today),
    (select count(*) from public.review_log where user_id = auth.uid())
';

-- Cards that come due per day (overdue cards count for today), for the next p_days days
create or replace function public.due_forecast(p_days integer default 7, p_tz text default 'UTC')
returns table (day date, due integer)
language sql stable set search_path = public as '
  with t as (select (now() at time zone p_tz)::date as today)
  select greatest(r.due_date, t.today), count(*)::integer
  from public.reviews r, t
  where r.user_id = auth.uid() and r.due_date <= t.today + (least(greatest(p_days, 1), 60) - 1)
  group by 1
  order by 1
';

-- Per category: how the cards are spread (new / learning under 21 days / mature) and accuracy over 30 days
create or replace function public.category_stats(p_tz text default 'UTC')
returns table (category_id uuid, total integer, new_cards integer, learning integer, mature integer, reviews_30 integer, good_30 integer)
language sql stable set search_path = public as '
  with t as (select (now() at time zone p_tz)::date as today),
  card_stats as (
    select k.category_id,
      count(*)::integer as total,
      (count(*) filter (where r.card_id is null))::integer as new_cards,
      (count(*) filter (where r.card_id is not null and r.interval_days < 21))::integer as learning,
      (count(*) filter (where r.interval_days >= 21))::integer as mature
    from public.cards k
    left join public.reviews r on r.card_id = k.id and r.user_id = auth.uid()
    where k.user_id = auth.uid()
    group by k.category_id
  ),
  log_stats as (
    select k.category_id,
      count(*)::integer as reviews_30,
      (count(*) filter (where l.rating in (''good'', ''easy'')))::integer as good_30
    from public.review_log l
    join public.cards k on k.id = l.card_id, t
    where l.user_id = auth.uid() and l.reviewed_at >= ((t.today - 29)::timestamp at time zone p_tz)
    group by k.category_id
  )
  select c.id,
    coalesce(cs.total, 0), coalesce(cs.new_cards, 0), coalesce(cs.learning, 0), coalesce(cs.mature, 0),
    coalesce(ls.reviews_30, 0), coalesce(ls.good_30, 0)
  from public.categories c
  left join card_stats cs on cs.category_id = c.id
  left join log_stats ls on ls.category_id = c.id
  where c.user_id = auth.uid()
  order by c.created_at
';

-- The cards with the most "again" ratings over the last 30 days
create or replace function public.weakest_cards(p_tz text default 'UTC', p_limit integer default 10)
returns table (card_id uuid, name_nl text, category_id uuid, again_count integer)
language sql stable set search_path = public as '
  select k.id, k.name_nl, k.category_id, count(*)::integer
  from public.review_log l
  join public.cards k on k.id = l.card_id
  where l.user_id = auth.uid()
    and l.rating = ''again''
    and l.reviewed_at >= ((((now() at time zone p_tz)::date) - 29)::timestamp at time zone p_tz)
  group by k.id, k.name_nl, k.category_id
  order by 4 desc, k.name_nl
  limit least(greatest(p_limit, 1), 50)
';

revoke all on function public.daily_review_counts(integer, text) from public, anon;
revoke all on function public.streak_stats(text) from public, anon;
revoke all on function public.due_forecast(integer, text) from public, anon;
revoke all on function public.category_stats(text) from public, anon;
revoke all on function public.weakest_cards(text, integer) from public, anon;
grant execute on function public.daily_review_counts(integer, text) to authenticated;
grant execute on function public.streak_stats(text) to authenticated;
grant execute on function public.due_forecast(integer, text) to authenticated;
grant execute on function public.category_stats(text) to authenticated;
grant execute on function public.weakest_cards(text, integer) to authenticated;

-- Make the new functions visible to the API straight away
notify pgrst, 'reload schema';

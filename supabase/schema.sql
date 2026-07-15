-- ─────────────────────────────────────────────────────────────────────────────
-- TypeScribe — Comprehensive Supabase schema
-- 27 tables + RLS + triggers + pgvector + seed achievements
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";
create extension if not exists "vector";     -- F1 Vibe Search
create extension if not exists "pg_trgm";    -- fuzzy title search

-- ─── profiles ───────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text unique not null,
  display_name        text not null default '',
  avatar              text default '',
  bio                 text default '',
  favorite_genres     text[] default '{}',
  min_rating          numeric(3,1) default 7.0,
  email_notifications boolean default true,
  public_profile      boolean default true,
  privacy_settings    jsonb default '{}'::jsonb,  -- {show_watchlist, show_ratings, show_community, allow_mentions}
  role                text default 'user' check (role in ('user','moderator','admin')),
  xp                  int default 0,
  streak_count        int default 0,
  longest_streak      int default 0,
  last_check_in       date,
  taste_dna           jsonb,
  personality_type    text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ─── watchlist ──────────────────────────────────────────────────────────────
create table if not exists public.watchlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  movie_id    int not null,
  movie_title text not null,
  poster_path text,
  media_type  text default 'movie',
  notes       text,
  priority    int default 0,
  added_at    timestamptz default now()
);
create index if not exists watchlist_user_idx on public.watchlist(user_id);

-- ─── watch_diary ────────────────────────────────────────────────────────────
create table if not exists public.watch_diary (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  movie_id     int not null,
  movie_title  text not null,
  poster_path  text,
  watched_on   date not null default current_date,
  rating       numeric(3,1) check (rating is null or rating between 0 and 10),
  rewatch      boolean default false,
  location     text,
  notes        text,
  created_at   timestamptz default now()
);
create index if not exists diary_user_idx on public.watch_diary(user_id, watched_on desc);

-- ─── reviews ────────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  movie_id     int not null,
  movie_title  text not null,
  rating       numeric(3,1) not null check (rating between 0 and 10),
  title        text default '',
  body         text default '',
  spoiler      boolean default false,
  helpful_count int default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists reviews_movie_idx on public.reviews(movie_id, created_at desc);
create index if not exists reviews_user_idx on public.reviews(user_id, created_at desc);

-- ─── review_helpful ─────────────────────────────────────────────────────────
create table if not exists public.review_helpful (
  review_id  uuid not null references public.reviews(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (review_id, user_id)
);

-- ─── scene_comments (F12) ───────────────────────────────────────────────────
create table if not exists public.scene_comments (
  id               uuid primary key default gen_random_uuid(),
  movie_id         int not null,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  timestamp_seconds int not null check (timestamp_seconds >= 0),
  comment          text not null,
  is_spoiler       boolean default false,
  helpful_count    int default 0,
  created_at       timestamptz default now()
);
create index if not exists scene_movie_idx on public.scene_comments(movie_id, timestamp_seconds);

-- ─── lists ──────────────────────────────────────────────────────────────────
create table if not exists public.lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text default '',
  is_public   boolean default true,
  cover_image text,
  item_count  int default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists public.list_items (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid not null references public.lists(id) on delete cascade,
  movie_id    int not null,
  movie_title text not null,
  poster_path text,
  order_index int default 0,
  note        text,
  added_at    timestamptz default now()
);
create index if not exists list_items_idx on public.list_items(list_id, order_index);

-- ─── follows (F24) ──────────────────────────────────────────────────────────
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on public.follows(followee_id);
create index if not exists follows_follower_idx on public.follows(follower_id);

-- ─── communities ────────────────────────────────────────────────────────────
create table if not exists public.communities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  description text default '',
  banner_url  text,
  category    text default 'general',
  member_count int default 0,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role         text default 'member' check (role in ('member','moderator','admin')),
  joined_at    timestamptz default now(),
  primary key (community_id, user_id)
);

-- ─── posts + comments + likes ───────────────────────────────────────────────
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references public.communities(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  title         text not null default '',
  body          text not null,
  like_count    int default 0,
  comment_count int default 0,
  created_at    timestamptz default now()
);
create index if not exists posts_community_idx on public.posts(community_id, created_at desc);

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  parent_id   uuid references public.comments(id) on delete cascade,
  body        text not null,
  like_count  int default 0,
  created_at  timestamptz default now()
);
create index if not exists comments_post_idx on public.comments(post_id, created_at);

create table if not exists public.likes (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('post','comment','review','scene_comment')),
  entity_id   uuid not null,
  value       smallint default 1,
  created_at  timestamptz default now(),
  primary key (user_id, entity_type, entity_id)
);

-- ─── achievements (F23) ─────────────────────────────────────────────────────
create table if not exists public.achievements (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  title       text not null,
  description text not null,
  icon        text default '🏆',
  tier        text default 'bronze' check (tier in ('bronze','silver','gold','platinum')),
  xp          int default 10,
  category    text default 'general',
  criteria    jsonb
);

create table if not exists public.user_achievements (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at    timestamptz default now(),
  primary key (user_id, achievement_id)
);

-- ─── notifications ──────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,
  actor_id    uuid references public.profiles(id) on delete set null,
  entity_type text,
  entity_id   text,
  message     text not null,
  read        boolean default false,
  created_at  timestamptz default now()
);
create index if not exists notif_user_idx on public.notifications(user_id, read, created_at desc);

-- ─── watch_parties (F21) ────────────────────────────────────────────────────
create table if not exists public.watch_parties (
  id            uuid primary key default gen_random_uuid(),
  host_id       uuid not null references public.profiles(id) on delete cascade,
  movie_id      int not null,
  movie_title   text not null,
  poster_path   text,
  scheduled_for timestamptz not null,
  room_code     text unique not null,
  status        text default 'scheduled' check (status in ('scheduled','live','ended')),
  attendee_count int default 0,
  created_at    timestamptz default now()
);

create table if not exists public.watch_party_attendees (
  party_id  uuid not null references public.watch_parties(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  rsvp      text default 'yes' check (rsvp in ('yes','maybe','no')),
  joined_at timestamptz default now(),
  primary key (party_id, user_id)
);

create table if not exists public.watch_party_chat (
  id            uuid primary key default gen_random_uuid(),
  party_id      uuid not null references public.watch_parties(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  body          text not null,
  timestamp_sec int,
  created_at    timestamptz default now()
);
create index if not exists chat_party_idx on public.watch_party_chat(party_id, created_at);

-- ─── taste_twins (F7) ───────────────────────────────────────────────────────
create table if not exists public.taste_twins (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  twin_user_id uuid not null references public.profiles(id) on delete cascade,
  similarity   numeric(5,4) not null,
  shared_count int default 0,
  computed_at  timestamptz default now(),
  primary key (user_id, twin_user_id),
  check (user_id <> twin_user_id)
);

-- ─── movie_embeddings (F1 Vibe Search) ──────────────────────────────────────
create table if not exists public.movie_embeddings (
  movie_id    int primary key,
  movie_title text not null,
  poster_path text,
  overview    text,
  release_date date,
  genres      text[] default '{}',
  embedding   vector(768),
  metadata    jsonb,
  created_at  timestamptz default now()
);
create index if not exists movie_embeddings_idx on public.movie_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ─── game_results (F32 grid, F31 six-degrees, F33 trivia) ───────────────────
create table if not exists public.game_results (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  game_type  text not null check (game_type in ('grid','six_degrees','trivia')),
  score      int default 0,
  details    jsonb,
  played_at  timestamptz default now()
);
create index if not exists game_user_idx on public.game_results(user_id, game_type, played_at desc);

-- ─── daily_grids (F32) ──────────────────────────────────────────────────────
create table if not exists public.daily_grids (
  id             uuid primary key default gen_random_uuid(),
  grid_date      date unique not null,
  criteria       jsonb not null,
  solution_ids   int[] not null,
  solution_titles text[] not null,
  solution_posters text[] not null,
  created_at     timestamptz default now()
);

-- ─── ai_content_cache ───────────────────────────────────────────────────────
create table if not exists public.ai_content_cache (
  cache_key   text primary key,
  content     jsonb not null,
  expires_at  timestamptz,
  created_at  timestamptz default now()
);

-- ─── newsletter_subscriptions ───────────────────────────────────────────────
create table if not exists public.newsletter_subscriptions (
  email      text primary key,
  confirmed  boolean default false,
  frequency  text default 'weekly' check (frequency in ('daily','weekly','monthly')),
  created_at timestamptz default now()
);

-- ─── scene_reactions ────────────────────────────────────────────────────────
create table if not exists public.scene_reactions (
  id            uuid primary key default gen_random_uuid(),
  movie_id      int not null,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  timestamp_sec int not null,
  emoji         text not null,
  created_at    timestamptz default now()
);
create index if not exists reactions_movie_idx on public.scene_reactions(movie_id, timestamp_sec);

-- ─── daily_trivia (F33) ─────────────────────────────────────────────────────
create table if not exists public.daily_trivia (
  id          uuid primary key default gen_random_uuid(),
  trivia_date date unique not null,
  movie_id    int not null,
  question    text not null,
  choices     text[] not null,
  answer_idx  int not null check (answer_idx >= 0),
  explanation text,
  created_at  timestamptz default now()
);

-- ─── mood_heatmap (F36) ─────────────────────────────────────────────────────
create table if not exists public.mood_heatmap (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  mood         text not null,
  movie_id     int not null,
  movie_title  text not null,
  poster_path  text,
  rating       numeric(3,1),
  logged_at    timestamptz default now(),
  primary key (user_id, mood, movie_id)
);

-- ─── monthly_festivals (F40) ────────────────────────────────────────────────
create table if not exists public.monthly_festivals (
  id            uuid primary key default gen_random_uuid(),
  festival_key  text unique not null,        -- e.g. 2026-07
  title         text not null,
  description   text,
  poster_url    text,
  movie_ids     int[] not null default '{}',
  movie_titles  text[] not null default '{}',
  movie_posters text[] not null default '{}',
  starts_on     date not null,
  ends_on       date not null,
  created_at    timestamptz default now()
);

-- ─── six_degrees_chains (F31) ───────────────────────────────────────────────
create table if not exists public.six_degrees_chains (
  id            uuid primary key default gen_random_uuid(),
  start_actor   text not null,
  end_actor     text not null,
  chain         jsonb not null,
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────────────────────────────────────

-- auto-create profile when auth.users row inserted
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at auto-maintenance
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists lists_touch on public.lists;
create trigger lists_touch before update on public.lists
  for each row execute function public.touch_updated_at();

drop trigger if exists reviews_touch on public.reviews;
create trigger reviews_touch before update on public.reviews
  for each row execute function public.touch_updated_at();

-- Denormalised counters
create or replace function public.increment_review_helpful()
returns trigger language plpgsql as $$
begin
  if new is not null then
    update public.reviews set helpful_count = helpful_count + 1 where id = new.review_id;
  end if;
  return new;
end;
$$;
drop trigger if exists review_helpful_inc on public.review_helpful;
create trigger review_helpful_inc after insert on public.review_helpful
  for each row execute function public.increment_review_helpful();

create or replace function public.adjust_like_counter()
returns trigger language plpgsql as $$
declare
  tbl text;
begin
  case new.entity_type
    when 'post'         then tbl := 'public.posts';
    when 'comment'      then tbl := 'public.comments';
    when 'review'       then tbl := 'public.reviews';
    when 'scene_comment' then tbl := 'public.scene_comments';
    else return new;
  end case;
  execute format('update %s set like_count = like_count + %s where id = $1', tbl, new.value)
    using new.entity_id;
  return new;
end;
$$;
drop trigger if exists likes_inc on public.likes;
create trigger likes_inc after insert on public.likes
  for each row execute function public.adjust_like_counter();

create or replace function public.adjust_member_count()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.communities set member_count = member_count + 1 where id = new.community_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.communities set member_count = greatest(0, member_count - 1) where id = old.community_id;
    return old;
  end if;
  return null;
end;
$$;
drop trigger if exists community_member_inc on public.community_members;
create trigger community_member_inc after insert or delete on public.community_members
  for each row execute function public.adjust_member_count();

create or replace function public.adjust_attendee_count()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.watch_parties set attendee_count = attendee_count + 1 where id = new.party_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.watch_parties set attendee_count = greatest(0, attendee_count - 1) where id = old.party_id;
    return old;
  end if;
  return null;
end;
$$;
drop trigger if exists attendee_inc on public.watch_party_attendees;
create trigger attendee_inc after insert or delete on public.watch_party_attendees
  for each row execute function public.adjust_attendee_count();

-- Award XP when an achievement is unlocked
create or replace function public.award_achievement_xp()
returns trigger language plpgsql as $$
declare
  xp_value int;
begin
  select xp into xp_value from public.achievements where id = new.achievement_id;
  if xp_value is not null then
    update public.profiles set xp = xp + xp_value where id = new.user_id;
  end if;
  return new;
end;
$$;
drop trigger if exists user_achievement_xp on public.user_achievements;
create trigger user_achievement_xp after insert on public.user_achievements
  for each row execute function public.award_achievement_xp();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles              enable row level security;
alter table public.watchlist             enable row level security;
alter table public.watch_diary           enable row level security;
alter table public.reviews               enable row level security;
alter table public.review_helpful        enable row level security;
alter table public.scene_comments        enable row level security;
alter table public.lists                 enable row level security;
alter table public.list_items            enable row level security;
alter table public.follows               enable row level security;
alter table public.communities           enable row level security;
alter table public.community_members     enable row level security;
alter table public.posts                 enable row level security;
alter table public.comments              enable row level security;
alter table public.likes                 enable row level security;
alter table public.achievements          enable row level security;
alter table public.user_achievements     enable row level security;
alter table public.notifications         enable row level security;
alter table public.watch_parties         enable row level security;
alter table public.watch_party_attendees enable row level security;
alter table public.watch_party_chat      enable row level security;
alter table public.taste_twins           enable row level security;
alter table public.movie_embeddings      enable row level security;
alter table public.game_results          enable row level security;
alter table public.daily_grids           enable row level security;
alter table public.ai_content_cache      enable row level security;
alter table public.newsletter_subscriptions enable row level security;
alter table public.scene_reactions       enable row level security;
alter table public.daily_trivia          enable row level security;
alter table public.mood_heatmap          enable row level security;
alter table public.monthly_festivals     enable row level security;
alter table public.six_degrees_chains    enable row level security;

-- Profiles: anyone can read public; owner can read+write own
create policy "profiles_public_read" on public.profiles for select using (public_profile = true or auth.uid() = id);
create policy "profiles_owner_write" on public.profiles for update using (auth.uid() = id);
create policy "profiles_owner_insert" on public.profiles for insert with check (auth.uid() = id);

-- Generic "owner-only" pattern for personal tables
create policy "watchlist_owner"     on public.watchlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "diary_owner"         on public.watch_diary for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reviews_owner_w"     on public.reviews for insert with check (auth.uid() = user_id);
create policy "reviews_owner_u"     on public.reviews for update using (auth.uid() = user_id);
create policy "reviews_owner_d"     on public.reviews for delete using (auth.uid() = user_id);
create policy "reviews_public_r"    on public.reviews for select using (true);
create policy "review_helpful_owner" on public.review_helpful for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "scene_comments_r"    on public.scene_comments for select using (true);
create policy "scene_comments_w"    on public.scene_comments for insert with check (auth.uid() = user_id);
create policy "scene_comments_owner" on public.scene_comments for delete using (auth.uid() = user_id);
create policy "lists_owner_w"       on public.lists for insert with check (auth.uid() = user_id);
create policy "lists_owner_u"       on public.lists for update using (auth.uid() = user_id);
create policy "lists_owner_d"       on public.lists for delete using (auth.uid() = user_id);
create policy "lists_public_r"      on public.lists for select using (is_public = true or auth.uid() = user_id);
create policy "list_items_r"        on public.list_items for select using (true);
create policy "list_items_owner"    on public.list_items for insert with check (auth.uid() in (select user_id from public.lists where id = list_id));
create policy "list_items_owner_d"  on public.list_items for delete using (auth.uid() in (select user_id from public.lists where id = list_id));

-- Follows: anyone can read; owner can write
create policy "follows_read"  on public.follows for select using (true);
create policy "follows_write" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete" on public.follows for delete using (auth.uid() = follower_id);

-- Communities: public read; member-write
create policy "communities_read"  on public.communities for select using (true);
create policy "communities_insert" on public.communities for insert with check (auth.uid() = created_by);
create policy "communities_update" on public.communities for update using (auth.uid() = created_by);
create policy "community_members_read" on public.community_members for select using (true);
create policy "community_members_insert" on public.community_members for insert with check (auth.uid() = user_id);
create policy "community_members_delete" on public.community_members for delete using (auth.uid() = user_id);

-- Posts/comments: public read, owner-write
create policy "posts_read"    on public.posts for select using (true);
create policy "posts_insert"  on public.posts for insert with check (auth.uid() = author_id);
create policy "posts_update"  on public.posts for update using (auth.uid() = author_id);
create policy "posts_delete"  on public.posts for delete using (auth.uid() = author_id);
create policy "comments_read" on public.comments for select using (true);
create policy "comments_insert" on public.comments for insert with check (auth.uid() = author_id);
create policy "comments_delete" on public.comments for delete using (auth.uid() = author_id);
create policy "likes_insert" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes_delete" on public.likes for delete using (auth.uid() = user_id);

-- Achievements: public read; user can read own unlocks
create policy "achievements_read" on public.achievements for select using (true);
create policy "user_achievements_read" on public.user_achievements for select using (auth.uid() = user_id);
create policy "user_achievements_insert" on public.user_achievements for insert with check (auth.uid() = user_id);

-- Notifications: owner-only
create policy "notif_read"   on public.notifications for select using (auth.uid() = user_id);
create policy "notif_update" on public.notifications for update using (auth.uid() = user_id);
create policy "notif_insert" on public.notifications for insert with check (auth.uid() = user_id or auth.uid() = actor_id);

-- Watch parties: public read; host-write
create policy "wp_read"   on public.watch_parties for select using (true);
create policy "wp_insert" on public.watch_parties for insert with check (auth.uid() = host_id);
create policy "wp_update" on public.watch_parties for update using (auth.uid() = host_id);
create policy "wpa_read"   on public.watch_party_attendees for select using (true);
create policy "wpa_insert" on public.watch_party_attendees for insert with check (auth.uid() = user_id);
create policy "wpa_delete" on public.watch_party_attendees for delete using (auth.uid() = user_id);
create policy "wp_chat_read"   on public.watch_party_chat for select using (true);
create policy "wp_chat_insert" on public.watch_party_chat for insert with check (auth.uid() = user_id);

-- Taste twins: owner-only
create policy "taste_twins_read" on public.taste_twins for select using (auth.uid() = user_id);

-- Game results, mood heatmap: owner-only
create policy "game_owner"     on public.game_results for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mood_owner"     on public.mood_heatmap for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public reads
create policy "grid_read"      on public.daily_grids for select using (true);
create policy "embeddings_read" on public.movie_embeddings for select using (true);
create policy "ai_cache_read"  on public.ai_content_cache for select using (true);
create policy "ai_cache_write" on public.ai_content_cache for insert with check (true);
create policy "newsletter_owner" on public.newsletter_subscriptions for all using (true) with check (true);
create policy "reactions_owner" on public.scene_reactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reactions_read"  on public.scene_reactions for select using (true);
create policy "trivia_read"   on public.daily_trivia for select using (true);
create policy "festivals_read" on public.monthly_festivals for select using (true);
create policy "six_degrees_read" on public.six_degrees_chains for select using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed achievements
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.achievements (code, title, description, icon, tier, xp, category) values
  ('first_review',     'First Words',              'Wrote your first review',           '✍️', 'bronze',   10, 'reviews'),
  ('ten_reviews',      'Prolific Critic',          'Wrote 10 reviews',                  '📝', 'silver',   50, 'reviews'),
  ('fifty_reviews',    'Critic Laureate',          'Wrote 50 reviews',                  '🎓', 'gold',    200, 'reviews'),
  ('first_diary',      'First Watch',              'Logged your first movie in diary',  '🍿', 'bronze',   10, 'diary'),
  ('ten_diary',        'Marathoner',               'Logged 10 movies',                  '🏃', 'silver',   50, 'diary'),
  ('fifty_diary',      'Cinephile',                'Logged 50 movies',                  '🎬', 'gold',    200, 'diary'),
  ('hundred_diary',    'Centurion',                'Logged 100 movies',                 '💯', 'platinum',500, 'diary'),
  ('first_list',       'Curator',                  'Created your first list',           '📋', 'bronze',   10, 'lists'),
  ('five_lists',       'List Maker',               'Created 5 lists',                   '📚', 'silver',   50, 'lists'),
  ('first_community',  'Community Builder',        'Created a community',               '🏘️', 'bronze',   10, 'community'),
  ('first_follow',     'Social Butterfly',         'Followed your first user',          '🦋', 'bronze',   10, 'social'),
  ('ten_followers',    'Rising Star',              'Got 10 followers',                  '⭐', 'silver',   50, 'social'),
  ('hundred_followers','Influencer',               'Got 100 followers',                 '🌟', 'gold',    200, 'social'),
  ('streak_3',         'Three-Day Streak',         '3-day check-in streak',             '🔥', 'bronze',   15, 'streak'),
  ('streak_7',         'Week Warrior',             '7-day check-in streak',             '⚔️', 'silver',   50, 'streak'),
  ('streak_30',        'Monthly Devotee',          '30-day check-in streak',            '🌙', 'gold',    200, 'streak'),
  ('streak_100',       'Centurion Streak',         '100-day check-in streak',           '🏆', 'platinum',500, 'streak'),
  ('grid_perfect',     'Immaculate',               '9/9 on an Immaculate Grid',         '🎯', 'gold',    150, 'games'),
  ('grid_first',       'Grid Newcomer',            'Played your first grid',            '🎲', 'bronze',   10, 'games'),
  ('personality',      'Self-Aware',               'Discovered your movie personality', '🧠', 'bronze',   20, 'personality'),
  ('taste_twin',       'Soul Twin',                'Found your taste twin',             '👯', 'silver',   30, 'social'),
  ('watch_party_host', 'Party Host',               'Hosted a watch party',              '🎉', 'silver',   30, 'community')
on conflict (code) do nothing;

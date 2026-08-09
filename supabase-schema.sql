/*
Updated supabase-schema.sql — run this in your Supabase SQL editor to create the required tables
and demo Row Level Security (RLS) policies for testing.

IMPORTANT: The demo policies below are permissive to make local testing easy. Review and lock down
these policies before production use.
*/

-- rooms
create table if not exists rooms (
  id text primary key,
  owner text,
  created_at timestamptz default now(),
  started boolean default false,
  mode text default 'guess',
  current_round text
);

-- players
create table if not exists players (
  id text primary key,
  room_id text references rooms(id) on delete cascade,
  name text,
  joined_at timestamptz default now(),
  is_host boolean default false,
  score int default 0
);

-- rounds
create table if not exists rounds (
  id text primary key,
  room_id text references rooms(id) on delete cascade,
  round_index int,
  question text,
  choices jsonb,
  correct_choice text,
  youtube_id text,
  created_at timestamptz default now()
);

-- answers
create table if not exists answers (
  id text primary key,
  round_id text references rounds(id) on delete cascade,
  player_id text references players(id) on delete cascade,
  choice text,
  is_correct boolean default false,
  submitted_at timestamptz default now()
);

-- Enable Row Level Security for tables and add demo policies
-- NOTE: If your project uses a database with RLS off by default, enabling it will require policies to allow operations.

-- Enable RLS
alter table rooms enable row level security;
alter table players enable row level security;
alter table rounds enable row level security;
alter table answers enable row level security;

-- ROOMS policies
-- Allow anyone to select rooms
create policy "rooms_select_public" on rooms for select using (true);
-- Allow anyone to insert rooms (WITH CHECK)
create policy "rooms_insert_public" on rooms for insert with check (true);
-- Allow anyone to update rooms (for demo only)
create policy "rooms_update_public" on rooms for update using (true) with check (true);

-- PLAYERS policies
create policy "players_select_public" on players for select using (true);
create policy "players_insert_public" on players for insert with check (true);
create policy "players_update_public" on players for update using (true) with check (true);
create policy "players_delete_public" on players for delete using (true);

-- ROUNDS policies
create policy "rounds_select_public" on rounds for select using (true);
create policy "rounds_insert_public" on rounds for insert with check (true);
create policy "rounds_update_public" on rounds for update using (true) with check (true);

-- ANSWERS policies
create policy "answers_select_public" on answers for select using (true);
create policy "answers_insert_public" on answers for insert with check (true);
create policy "answers_update_public" on answers for update using (true) with check (true);

-- Convenience RPC for incrementing score (optional)
create or replace function public.increment_player_score(p_id text, amount int)
returns void language sql security definer as $$
  update players set score = coalesce(score,0) + amount where id = p_id;
$$;

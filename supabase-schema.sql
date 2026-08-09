/*
Updated supabase-schema.sql — run this in your Supabase SQL editor to create the required tables
This extends the previous minimal schema with rounds and answers and player scores.
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

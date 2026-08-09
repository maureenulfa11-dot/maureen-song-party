-- supabase-schema.sql
-- Minimal schema for rooms, players, and songs

create table rooms (
  id text primary key,
  owner text,
  created_at timestamptz default now(),
  started boolean default false
);

create table players (
  id text primary key,
  room_id text references rooms(id) on delete cascade,
  name text,
  joined_at timestamptz default now(),
  is_host boolean default false
);

create table songs (
  id text primary key,
  room_id text references rooms(id) on delete cascade,
  title text,
  artist text,
  youtube_id text,
  added_at timestamptz default now()
);

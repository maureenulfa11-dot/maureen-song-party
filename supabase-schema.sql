CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT,
  status TEXT DEFAULT 'lobby',
  current_question_index INTEGER DEFAULT 0,
  revealed BOOLEAN DEFAULT false,
  points_per_correct INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  song_title TEXT NOT NULL,
  artist TEXT NOT NULL,
  youtube_url TEXT,
  youtube_video_id TEXT,
  youtube_search_query TEXT,
  start_seconds INTEGER DEFAULT 0,
  game_mode TEXT,
  passage_template TEXT,
  blanks JSONB,
  sort_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS passage_answers (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  selections JSONB,
  correct_count INTEGER,
  points_awarded INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (player_id) REFERENCES players(id),
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  items JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
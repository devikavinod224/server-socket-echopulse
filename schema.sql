-- PostgreSQL Schema for Echopulse Music App (Supabase)

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Languages Table
CREATE TABLE IF NOT EXISTS languages (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL, -- e.g. 'Malayalam', 'Tamil', 'Hindi', 'English'
    code TEXT UNIQUE NOT NULL -- e.g. 'ml', 'ta', 'hi', 'en'
);

-- 3. Songs Table
CREATE TABLE IF NOT EXISTS songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    image_url TEXT,
    streaming_url TEXT, -- Nullable because playlists/albums don't have a single URL
    duration INTEGER, -- in seconds
    language_id INTEGER REFERENCES languages(id),
    genre TEXT,
    release_date DATE DEFAULT CURRENT_DATE,
    source TEXT DEFAULT 'YouTube',
    perma_url TEXT UNIQUE,
    trending_score FLOAT DEFAULT 0,
    play_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Song Stats (For Trending Algorithm)
CREATE TABLE IF NOT EXISTS song_stats (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    plays_today INTEGER DEFAULT 0,
    plays_this_week INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Home Categories
CREATE TABLE IF NOT EXISTS home_categories (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- 6. Insert default languages
INSERT INTO languages (name, code) VALUES 
('Malayalam', 'ml'),
('Tamil', 'ta'),
('Hindi', 'hi'),
('English', 'en'),
('Telugu', 'te'),
('Kannada', 'kn')
ON CONFLICT DO NOTHING;

-- 7. Insert default categories
INSERT INTO home_categories (title, priority) VALUES 
('Trending Now', 1),
('New Releases', 2),
('Top Charts', 3),
('Popular Categories', 4)
ON CONFLICT DO NOTHING;

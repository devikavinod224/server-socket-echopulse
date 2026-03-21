const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

// Mock data generator for initial setup if DB is empty
const getMockSongs = (lang = 'English') => [
  {
    id: 'mock-1',
    title: `Trending ${lang} Song 1`,
    artist: 'Artist A',
    image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300',
    streaming_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    language: lang,
    source: 'Mock'
  },
  {
    id: 'mock-2',
    title: `New Release in ${lang}`,
    artist: 'Artist B',
    image_url: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=300',
    streaming_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    language: lang,
    source: 'Mock'
  }
];

// GET /api/v1/home
router.get('/home', async (req, res) => {
  try {
    const { data: songs, error } = await supabase
      .from('songs')
      .select('*, languages(name)')
      .eq('source', 'YouTube')
      .order('trending_score', { ascending: false });

    if (error) throw error;

    // 1. Extract Head (Top 10 overall)
    const head = songs.slice(0, 10);

    // 2. Group into Sections (Body) by Language/Region
    const sectionsMap = {};
    songs.forEach(song => {
      const sectionTitle = song.languages ? `Trending in ${song.languages.name}` : 'YouTube Trending';
      if (!sectionsMap[sectionTitle]) sectionsMap[sectionTitle] = [];
      if (sectionsMap[sectionTitle].length < 15) {
        sectionsMap[sectionTitle].push(song);
      }
    });

    const body = Object.keys(sectionsMap).map(title => ({
      title,
      items: sectionsMap[title]
    }));

    // Mock fallback if DB is still empty
    if (songs.length === 0) {
      return res.json({
        head: [{ id: 'mock-yt-1', title: 'YouTube Trending #1', artist: 'Artist', image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300', source: 'YouTube' }],
        body: [{ title: 'YouTube Trending', items: [{ id: 'mock-yt-1', title: 'YouTube Trending #1', artist: 'Artist', image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300', source: 'YouTube' }] }]
      });
    }

    res.json({ head, body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

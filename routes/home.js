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
    const lang = req.query.lang || 'English';
    
    // 1. Fetch Trending Songs
    let { data: trending, error: trendErr } = await supabase
      .from('songs')
      .select('*')
      .order('trending_score', { ascending: false })
      .limit(10);

    // 2. Fetch New Releases
    let { data: latest, error: lateErr } = await supabase
      .from('songs')
      .select('*')
      .eq('language', lang)
      .order('release_date', { ascending: false })
      .limit(10);

    // If DB is empty, use mock data temporarily
    if ((!trending || trending.length === 0) && (!latest || latest.length === 0)) {
      return res.json({
        head: getMockSongs('Viral'),
        body: [
          { title: 'Trending Now', items: getMockSongs('Trending') },
          { title: `Latest in ${lang}`, items: getMockSongs(lang) }
        ]
      });
    }

    res.json({
      head: trending,
      body: [
        { title: 'Trending Now', items: trending },
        { title: `Latest in ${lang}`, items: latest }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

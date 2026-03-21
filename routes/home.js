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
      .order('trending_score', { ascending: false })
      .limit(100);

    if (error) throw error;

    // 1. Extract Head (Top items from any source)
    const head = songs.slice(0, 10);

    // 2. Group into specialized sections by Source
    const saavnItems = songs.filter(s => s.source === 'Saavn').slice(0, 15);
    const ytMusicItems = songs.filter(s => s.source === 'YouTube_Music').slice(0, 15);
    const ytVideoItems = songs.filter(s => s.source === 'YouTube_Video').slice(0, 15);

    const body = [];
    if (saavnItems.length > 0) body.push({ title: 'Regional Premium Hits (Saavn)', items: saavnItems });
    if (ytMusicItems.length > 0) body.push({ title: 'Global Music Charts (YT Music)', items: ytMusicItems });
    if (ytVideoItems.length > 0) body.push({ title: 'Trending Music Videos (YouTube)', items: ytVideoItems });

    // Fallback if no data
    if (body.length === 0) {
      return res.json({
        head: [{ id: 'mock-1', title: 'Loading...', artist: 'Please run sync', image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300' }],
        body: [{ title: 'No Content Found', items: [] }]
      });
    }

    res.json({ head, body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

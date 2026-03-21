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
    // 1. Fetch Categories from SQL
    const { data: categories, error: catError } = await supabase
      .from('home_categories')
      .select('*')
      .order('priority', { ascending: true });

    if (catError) throw catError;

    // 2. Fetch plenty of songs for the Home Screen
    const { data: songs, error: songError } = await supabase
      .from('songs')
      .select('*, languages(name)')
      .order('trending_score', { ascending: false })
      .limit(250);

    if (songError) throw songError;

    // 3. Extract Head (Top 10 highest trending)
    // Filter out items missing critical data first
    const validSongs = songs.filter(s => s.image_url && s.streaming_url);
    const head = validSongs.slice(0, 10);
    const shownIds = new Set(head.map(s => s.id));

    // Helper: Disperse items by a key (e.g., artist or album) to ensure variety
    const disperse = (items, key, maxSame = 1) => {
      const result = [];
      const buckets = {};
      
      items.forEach(item => {
        const val = item[key] || 'Unknown';
        if (!buckets[val]) buckets[val] = [];
        buckets[val].push(item);
      });

      const keys = Object.keys(buckets).sort((a, b) => buckets[b].length - buckets[a].length);
      let total = items.length;
      
      while (total > 0) {
        let addedInRound = 0;
        for (const k of keys) {
          if (buckets[k].length > 0) {
            result.push(buckets[k].shift());
            total--;
            addedInRound++;
          }
        }
        if (addedInRound === 0) break;
      }
      return result;
    };

    // 4. Implement Mixed Logic for Body
    const body = [];

    for (const category of categories) {
      let items = [];

      switch (category.title) {
        case 'Trending Now':
          items = validSongs.filter(s => !shownIds.has(s.id));
          items = disperse(items, 'artist').slice(0, 20);
          break;
        
        case 'New Releases':
          items = validSongs
            .filter(s => !shownIds.has(s.id))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          items = disperse(items, 'artist').slice(0, 20);
          break;

        case 'Top Charts':
          const saavnHits = validSongs.filter(s => s.source === 'Saavn' && !shownIds.has(s.id)).slice(0, 10);
          const ytmHits = validSongs.filter(s => (s.source === 'YouTube_Music' || s.source === 'YouTube_Video') && !shownIds.has(s.id)).slice(0, 10);
          for (let i = 0; i < 10; i++) {
            if (ytmHits[i]) items.push(ytmHits[i]);
            if (saavnHits[i]) items.push(saavnHits[i]);
          }
          break;

        default:
          items = validSongs.filter(s => !shownIds.has(s.id)).slice(0, 15);
      }

      if (items.length > 0) {
        items.forEach(item => shownIds.add(item.id));
        body.push({
          id: category.id,
          title: category.title,
          items: items
        });
      }
    }

    // 5. Add Language-Specific Sections
    const { data: languages, error: langError } = await supabase
      .from('languages')
      .select('*');

    if (!langError && languages) {
      for (const lang of languages) {
        let langSongs = validSongs
          .filter(s => s.language_id === lang.id)
          .sort((a, b) => b.trending_score - a.trending_score);
        
        // Apply dispersal to language sections too
        langSongs = disperse(langSongs, 'album').slice(0, 20); // Disperse by album (thumbnails)
        
        if (langSongs.length > 0) {
          body.push({
            id: `lang-${lang.id}`,
            title: `${lang.name} Popular Hits`,
            items: langSongs
          });
        }
      }
    }

    // 6. Helper to format for Flutter
    const formatForFlutter = (song) => ({
      id: song.perma_url || song.id,
      title: song.title,
      subtitle: song.artist,
      image: song.image_url,
      type: 'video', 
      isWide: false,
      count: song.source === 'Saavn' ? 'Premium' : 'Trending',
      extras: {
        source: song.source,
        url: song.streaming_url
      }
    });

    // 7. Map Final Output
    const headFormatted = head.map(formatForFlutter);
    const bodyFormatted = body.map(section => ({
      ...section,
      items: section.items.map(formatForFlutter)
    }));

    // Fallback if no data
    if (bodyFormatted.length === 0) {
      return res.json({
        head: [formatForFlutter({ id: 'mock-1', title: 'Loading...', artist: 'Please run sync', image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300' })],
        body: [{ title: 'No Content Found', items: [] }]
      });
    }

    res.json({ head: headFormatted, body: bodyFormatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

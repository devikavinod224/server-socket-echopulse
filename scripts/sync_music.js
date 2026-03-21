const axios = require('axios');
const supabase = require('../utils/supabase');
const { getMusicHome } = require('../utils/youtube_scraper');

const countries = ['IN', 'US']; 
const saavnLanguages = [
  { name: 'Malayalam', query: 'Malayalam Top Songs' },
  { name: 'Tamil', query: 'Tamil Top Songs' },
  { name: 'Hindi', query: 'Hindi Top Songs' },
  { name: 'English', query: 'Global Billboard Hot 100' },
  { name: 'Mixed', query: 'Indian Trending Now 2024' }
];

async function syncMusic() {
  console.log('Starting Triple-Source Unified Sync...');

  const { data: langData } = await supabase.from('languages').select('*');
  const langMap = {};
  langData.forEach(l => langMap[l.code] = l.id);
  const getLangId = (name) => langData.find(l => l.name === name)?.id;

  // --- SOURCE 1: JioSaavn (Regional) ---
  console.log('Fetching JioSaavn Regional Trends...');
  for (const lang of saavnLanguages) {
    try {
      const response = await axios.get(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(lang.query)}&limit=15`);
      const results = response.data?.data?.results || [];
      const langId = getLangId(lang.name);

      const songsToUpsert = results.map(song => ({
        perma_url: song.url,
        title: song.name,
        artist: (song.artists?.primary || []).map(a => a.name).join(', '),
        album: song.album?.name,
        image_url: song.image?.[song.image.length - 1]?.url,
        streaming_url: song.downloadUrl?.[song.downloadUrl.length - 1]?.url,
        language_id: langId,
        source: 'Saavn',
        trending_score: 80 + (Math.random() * 20)
      })).filter(s => s.perma_url && s.title);

      await supabase.from('songs').upsert(songsToUpsert, { onConflict: 'perma_url' });
      console.log(`Synced ${songsToUpsert.length} matches for Saavn ${lang.name}`);
    } catch (e) {
      console.error(`Saavn sync failed for ${lang.name}:`, e.message);
    }
  }

  // --- SOURCE 2 & 3: YouTube (Music & Videos) ---
  for (const country of countries) {
    console.log(`Fetching YouTube Home for region: ${country}...`);
    const data = await getMusicHome(country);
    if (!data) continue;

    const uniqueSongsMap = {};
    const processItem = (item, isVideo) => {
      if (item.id && item.title) {
        // Only tag as English (ID 4) if it's from the US region.
        // For India (IN), leave language_id null by default so it doesn't pollute specific language filters.
        const languageId = country === 'US' ? (langMap['en'] || 4) : null;

        uniqueSongsMap[item.id] = {
          perma_url: item.id,
          title: item.title,
          artist: item.artist,
          album: isVideo ? 'YouTube Videos' : 'YouTube Music Charts',
          image_url: item.image_url,
          streaming_url: item.streaming_url,
          language_id: languageId,
          source: isVideo ? 'YouTube_Video' : 'YouTube_Music',
          trending_score: 70 + (Math.random() * 30)
        };
      }
    };

    data.head.forEach(item => processItem(item, item.type === 'video'));
    data.body.forEach(section => {
      const isVideoSection = section.title.toLowerCase().includes('video') || section.title.toLowerCase().includes('hit');
      section.items.forEach(item => processItem(item, item.type === 'video' || isVideoSection));
    });

    const songsToUpsert = Object.values(uniqueSongsMap);
    const { error } = await supabase.from('songs').upsert(songsToUpsert, { onConflict: 'perma_url' });

    if (error) {
      console.error(`Error upserting YouTube songs for ${country}:`, error.message);
    } else {
      console.log(`Successfully synced ${songsToUpsert.length} YouTube items for ${country}`);
    }
  }

  console.log('Triple-Source Unified Sync complete.');
}

syncMusic().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

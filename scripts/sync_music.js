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

// Blacklist for devotional/old content
const BLACKLIST = [
  'devotional', 'bhajan', 'ghazal', 'classic', 'old', '1990', '1980', '1970', '1960', '1950',
  'god', 'ayyappa', 'lord', 'jesus', 'allah', 'hindu', 'christian', 'muslim', 'prayer', 'mantra',
  'shiva', 'krishna', 'ganesha', 'ram', 'hanuman', 'stotram', 'suprabhatam', 'vintage'
];

function isBlacklisted(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return BLACKLIST.some(word => lower.includes(word));
}

async function syncMusic() {
  console.log('Starting Triple-Source Unified Sync (Curation Mode)...');

  const { data: langData } = await supabase.from('languages').select('*');
  const langMap = {};
  langData.forEach(l => langMap[l.code] = l.id);
  const getLangId = (name) => langData.find(l => l.name === name)?.id;

  // --- SOURCE 1: JioSaavn (Regional) ---
  console.log('Fetching JioSaavn Regional Trends...');
  for (const lang of saavnLanguages) {
    try {
      // Simplified query for better API results, still focusing on freshness
      const query = `${lang.name} Hits 2024 2025`;
      const response = await axios.get(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(query)}&limit=30`);
      const results = response.data?.data?.results || [];
      const langId = getLangId(lang.name);

      const songsToUpsert = results
        .filter(song => !isBlacklisted(song.name) && !isBlacklisted(song.artist))
        .map(song => {
          // Boost trending score for very new songs if year is available
          const isFresh = song.year === '2024' || song.year === '2025' || song.name.includes('2024');
          return {
            perma_url: song.url,
            title: song.name,
            artist: (song.artists?.primary || []).map(a => a.name).join(', '),
            album: song.album?.name,
            image_url: song.image?.[song.image.length - 1]?.url,
            streaming_url: song.downloadUrl?.[song.downloadUrl.length - 1]?.url,
            language_id: langId,
            source: 'Saavn',
            trending_score: (isFresh ? 95 : 75) + (Math.random() * 5)
          };
        }).filter(s => s.perma_url && s.title && s.streaming_url);

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
        // Skip blacklisted content from YouTube as well
        if (isBlacklisted(item.title) || isBlacklisted(item.artist)) {
          return;
        }

        // Only tag as English (ID 4) if it's from the US region.
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
          trending_score: (isVideo ? 75 : 85) + (Math.random() * 15)
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

const axios = require('axios');
const supabase = require('../utils/supabase');
const { getMusicHome } = require('../utils/youtube_scraper');

const currentYear = new Date().getFullYear(); // e.g., 2026

const countries = ['IN', 'US']; 
const saavnLanguages = [
  { name: 'Malayalam', query: 'Malayalam Top Songs' },
  { name: 'Tamil', query: 'Tamil Top Songs' },
  { name: 'Hindi', query: 'Hindi Top Songs' },
  { name: 'English', query: 'Global Billboard Hot 100' },
  { name: 'Mixed', query: `Indian Trending Now ${currentYear}` }
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

function cleanTitle(title) {
  if (!title) return '';
  let cleaned = title;
  
  // Remove everything in brackets () or []
  cleaned = cleaned.replace(/\s*[\(\[].*?[\)\]]\s*/g, ' ');
  
  // Remove text following a pipe |
  cleaned = cleaned.split('|')[0];
  
  // Remove "ft.", "feat.", "featuring" and anything after it
  cleaned = cleaned.replace(/\s+(ft\.|feat\.|featuring)\s+.*$/i, '');
  
  // Remove generic video/audio tags
  const removeWords = [
    'official video', 'official music video', 'official audio', 'lyric video', 
    'lyrics video', 'full video song', 'full video', 'full song', 'video song',
    'audio song', 'music video'
  ];
  removeWords.forEach(word => {
    const reg = new RegExp(word, 'gi');
    cleaned = cleaned.replace(reg, '');
  });

  // Clean up any double spaces, trailing hyphens, etc left behind
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/\s+-\s*$/, '').trim();

  return cleaned;
}

async function syncMusic() {
  console.log('--- STARTING TOTAL OVERHAUL SYNC (YouTube Focused) ---');

  // 1. PURGE OLD RECORDS (Clean Slate)
  console.log('Purging legacy database records to remove any remaining old content...');
  try {
    const { error: deleteError } = await supabase.from('songs').delete().neq('title', 'XYZ_NEVER_MATCH');
    if (deleteError) console.error('Failed to purge:', deleteError.message);
  } catch (e) {
    console.warn('Purge failed/skipped:', e.message);
  }

  const { data: langData } = await supabase.from('languages').select('*');
  const langMap = {};
  langData.forEach(l => langMap[l.code] = l.id);
  const getLangId = (name) => langData.find(l => l.name === name)?.id;


  // --- SOURCE 1: YouTube Home & Trends (Primary) ---
  for (const country of countries) {
    console.log(`Fetching YouTube Home for region: ${country}...`);
    const data = await getMusicHome(country);
    if (!data) continue;

    const uniqueSongsMap = {};
    const processItem = (item, isVideo) => {
      if (item.id && item.title) {
        if (isBlacklisted(item.title) || isBlacklisted(item.artist)) return;

        const languageId = country === 'US' ? (langMap['en'] || 4) : null;

        uniqueSongsMap[item.id] = {
          perma_url: item.id,
          title: cleanTitle(item.title),
          artist: item.artist,
          album: isVideo ? `YouTube Hits ${currentYear}` : `YouTube Music Charts ${currentYear}`,
          image_url: item.image_url,
          streaming_url: item.streaming_url,
          language_id: languageId,
          source: isVideo ? 'YouTube_Video' : 'YouTube_Music',
          trending_score: (isVideo ? 80 : 90) + (Math.random() * 10)
        };
      }
    };

    data.head.forEach(item => processItem(item, item.type === 'video'));
    data.body.forEach(section => {
      const isVideoSection = section.title.toLowerCase().includes('video') || section.title.toLowerCase().includes('hit');
      section.items.forEach(item => processItem(item, item.type === 'video' || isVideoSection));
    });

    const songsToUpsert = Object.values(uniqueSongsMap);
    await supabase.from('songs').upsert(songsToUpsert, { onConflict: 'perma_url' });
    console.log(`Successfully synced ${songsToUpsert.length} YouTube items for ${country}`);
  }

  // --- SOURCE 2: JioSaavn (Secondary - Only for Latest Hits) ---
  console.log(`Fetching JioSaavn Regional Hits ${currentYear}...`);
  for (const lang of saavnLanguages) {
    try {
      const query = `${lang.name} Songs Latest ${currentYear} hits`;
      const response = await axios.get(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(query)}&limit=25`);
      const results = response.data?.data?.results || [];
      const langId = getLangId(lang.name);

      const songsToUpsert = results
        .filter(song => !isBlacklisted(song.name) && !isBlacklisted(song.artist))
        .map(song => {
          const isFresh = song.year === currentYear.toString() || song.year === (currentYear - 1).toString() || song.name.includes(currentYear.toString());
          if (!isFresh) return null; // Skip if it's not actually fresh for current year
          
          return {
            perma_url: song.url,
            title: cleanTitle(song.name),
            artist: (song.artists?.primary || []).map(a => a.name).join(', '),
            album: song.album?.name,
            image_url: song.image?.[song.image.length - 1]?.url,
            streaming_url: song.downloadUrl?.[song.downloadUrl.length - 1]?.url,
            language_id: langId,
            source: 'Saavn',
            trending_score: 85 + (Math.random() * 5)
          };
        }).filter(s => s && s.perma_url && s.title && s.streaming_url);

      await supabase.from('songs').upsert(songsToUpsert, { onConflict: 'perma_url' });
      console.log(`Synced ${songsToUpsert.length} matches for Saavn ${lang.name}`);
    } catch (e) {
      console.error(`Saavn sync failed for ${lang.name}:`, e.message);
    }
  }

  console.log('Purify and Overhaul Sync complete.');
}

syncMusic().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

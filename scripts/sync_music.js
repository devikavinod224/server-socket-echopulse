const axios = require('axios');
const supabase = require('../utils/supabase');
const { getMusicHome } = require('../utils/youtube_scraper');

const currentYear = new Date().getFullYear(); // e.g., 2026

const countries = ['IN', 'US', 'GB']; 
const saavnLanguages = [
  { name: 'Malayalam', query: `Malayalam Movie Songs ${currentYear}` },
  { name: 'Tamil', query: `Tamil Movie Songs ${currentYear}` },
  { name: 'Hindi', query: `Hindi Movie Songs ${currentYear}` },
  { name: 'English', query: `Global Hot Hits ${currentYear}` },
  { name: 'Telugu', query: `Telugu Movie Songs ${currentYear}` }
];

// Blacklist for devotional/old content
const BLACKLIST = [
  'devotional', 'bhajan', 'ghazal', 'classic', 'old', 'god', 'ayyappa', 'lord', 'jesus', 'allah', 
  'hindu', 'christian', 'muslim', 'prayer', 'mantra', 'shiva', 'krishna', 'ganesha', 'ram', 
  'hanuman', 'stotram', 'suprabhatam', 'vintage', 'happy new year', 'christmas', 'seasonal', 
  'holiday', 'greeting', 'wishes', 'retro', 'evergreen', 'remix', 'dj', 'non-stop', 'jukebox', 
  'collection', 'mashup', 'medley', 'hits of', 'best of', '90s', '80s', '70s', '60s', 'viral'
];

function isRetro(text) {
  if (!text) return false;
  // Match any year between 1900 and 2023
  const retroYearRegex = /\b(19\d{2}|20[0-1]\d|202[0-3])\b/g;
  return retroYearRegex.test(text);
}


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

  const { data: langData, error: langError } = await supabase.from('languages').select('*');
  if (langError || !langData) {
    console.error('Failed to fetch languages:', langError?.message || 'No data');
    return;
  }
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
        if (isRetro(item.title) || isRetro(item.artist)) return; // BLOCK RETRO CONTENT

        const languageId = country === 'US' || country === 'GB' ? (langMap['en'] || 4) : null;

        uniqueSongsMap[item.id] = {
          perma_url: item.id,
          title: cleanTitle(item.title),
          artist: item.artist,
          album: isVideo ? 'YouTube Viral Hits' : 'YouTube Music Charts',
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
      const lowerTitle = section.title.toLowerCase();
      // Heavily prioritize "New Releases" and "Top" charts
      const isNewRelease = lowerTitle.includes('new') || lowerTitle.includes('release') || lowerTitle.includes('latest');
      const isVideoSection = lowerTitle.includes('video') || lowerTitle.includes('hit');
      
      section.items.forEach(item => {
        if (!uniqueSongsMap[item.id]) {
          processItem(item, item.type === 'video' || isVideoSection);
          if (uniqueSongsMap[item.id] && isNewRelease) {
            uniqueSongsMap[item.id].trending_score += 50; // Massively boost new releases
          }
        }
      });
    });

    const songsToUpsert = Object.values(uniqueSongsMap);
    await supabase.from('songs').upsert(songsToUpsert, { onConflict: 'perma_url' });
    console.log(`Successfully synced ${songsToUpsert.length} YouTube items for ${country}`);
  }

  // --- SOURCE 2: JioSaavn (Secondary - Only for Latest Hits) ---
  console.log('Fetching JioSaavn Latest Regional Hits...');
  for (const lang of saavnLanguages) {
    try {
      const query = lang.query;
      const response = await axios.get(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(query)}&limit=30`);
      const results = response.data?.data?.results || [];
      const langId = getLangId(lang.name);

      const songsToUpsert = results
        .filter(song => {
          if (isBlacklisted(song.name) || isBlacklisted(song.artist) || isBlacklisted(song.album?.name)) return false;
          if (isRetro(song.name) || isRetro(song.artist) || isRetro(song.album?.name)) return false;
          // STRICT Year check: 2024-2026 only
          if (song.year && !['2024', '2025', '2026'].includes(song.year.toString())) return false;
          return true;
        })
        .map(song => {
          return {
            perma_url: song.url,
            title: cleanTitle(song.name),
            artist: (song.artists?.primary || []).map(a => a.name).join(', '),
            album: song.album?.name || 'Latest Hits',
            image_url: song.image?.[song.image.length - 1]?.url,
            streaming_url: song.downloadUrl?.[song.downloadUrl.length - 1]?.url,
            language_id: langId,
            source: 'Saavn',
            trending_score: (song.year === '2026' ? 98 : 94) + (Math.random() * 2)
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

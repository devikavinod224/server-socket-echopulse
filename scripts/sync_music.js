const supabase = require('../utils/supabase');
const { getMusicHome } = require('../utils/youtube_scraper');

// We can support multiple country codes to get diverse trending data
const countries = ['IN', 'US', 'GB']; 

async function syncMusic() {
  console.log('Starting Unified YouTube Sync...');

  // 1. Get Language IDs (mapping YouTube regions to our DB languages if applicable)
  // For now, we'll just use a 'Global' or 'English' default if not strictly matched
  const { data: langData } = await supabase.from('languages').select('*');
  const langMap = {};
  langData.forEach(l => langMap[l.code] = l.id);

  for (const country of countries) {
    console.log(`Fetching YouTube Music Home for region: ${country}...`);
    const data = await getMusicHome(country);

    if (!data) {
      console.warn(`Failed to fetch YouTube data for ${country}`);
      continue;
    }

    // Combine head and body items for a flat upsert list
    const allSongs = [];
    
    // Add carousel items
    data.head.forEach(item => allSongs.push(item));
    
    // Add section items
    data.body.forEach(section => {
      section.items.forEach(item => allSongs.push(item));
    });

    console.log(`Processing ${allSongs.length} items for ${country}...`);

    // Deduplicate songs by perma_url before upserting to prevent Supabase errors
    const uniqueSongsMap = {};
    allSongs.forEach(song => {
      if (song.id && song.title) {
        uniqueSongsMap[song.id] = {
          perma_url: song.id,
          title: song.title,
          artist: song.artist,
          album: 'YouTube Trending',
          image_url: song.image_url,
          streaming_url: song.streaming_url,
          language_id: langMap[country.toLowerCase()] || langMap['en'] || (langData[0] ? langData[0].id : null),
          source: 'YouTube',
          trending_score: Math.random() * 100
        };
      }
    });

    const songsToUpsert = Object.values(uniqueSongsMap);

    const { error } = await supabase
      .from('songs')
      .upsert(songsToUpsert, { onConflict: 'perma_url' });

    if (error) {
      console.error(`Error upserting songs for ${country}:`, error.message);
    } else {
      console.log(`Successfully synced ${songsToUpsert.length} items for ${country}`);
    }
  }

  console.log('Unified YouTube Sync complete.');
}

syncMusic().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

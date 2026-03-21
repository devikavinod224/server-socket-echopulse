const axios = require('axios');
const supabase = require('../utils/supabase');

const languages = [
  { name: 'Malayalam', query: 'Malayalam trending' },
  { name: 'Tamil', query: 'Tamil trending' },
  { name: 'Hindi', query: 'Hindi trending' },
  { name: 'English', query: 'English trending' }
];

async function getLanguageId(langName) {
  const { data, error } = await supabase
    .from('languages')
    .select('id')
    .eq('name', langName)
    .single();
  
  if (error) {
    console.error(`Error fetching language ID for ${langName}:`, error.message);
    return null;
  }
  return data.id;
}

async function syncMusic() {
  console.log('Starting music sync...');

  for (const lang of languages) {
    console.log(`Syncing ${lang.name}...`);
    try {
      // Use a public saavn.dev API for demonstration
      const response = await axios.get(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(lang.query)}&limit=10`);
      
      if (!response.data || !response.data.data || !response.data.data.results) {
        console.warn(`No results for ${lang.name}`);
        continue;
      }

      const langId = await getLanguageId(lang.name);
      if (!langId) continue;

      const results = response.data.data.results;
      const songsToUpsert = results.map(song => ({
        // Use a consistent ID generation or perma_url for upsert
        perma_url: song.url,
        title: song.name,
        artist: song.artists.primary.map(a => a.name).join(', '),
        album: song.album.name,
        image_url: song.image[song.image.length - 1].url, // Highest resolution
        streaming_url: song.downloadUrl[song.downloadUrl.length - 1].url, // Highest bit-rate
        duration: parseInt(song.duration),
        language_id: langId,
        source: 'Saavn',
        trending_score: Math.random() * 100 // Mock trending score for demo
      }));

      // Upsert into Supabase (requires match on a unique column, like perma_url/id)
      const { data, error } = await supabase
        .from('songs')
        .upsert(songsToUpsert, { onConflict: 'perma_url' });

      if (error) {
        console.error(`Error upserting ${lang.name} songs:`, error.message);
      } else {
        console.log(`Successfully synced ${songsToUpsert.length} songs for ${lang.name}`);
      }
    } catch (err) {
      console.error(`Failed to sync ${lang.name}:`, err.message);
    }
  }

  console.log('Music sync complete.');
}

// Run the sync
syncMusic().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

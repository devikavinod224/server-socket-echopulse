const supabase = require('../utils/supabase');
async function check() {
  const { data, error } = await supabase.from('songs').select('*').limit(15).order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    return;
  }
  console.log(JSON.stringify(data.map(s => ({ title: s.title, artist: s.artist, score: s.trending_score, source: s.source })), null, 2));
}
check();

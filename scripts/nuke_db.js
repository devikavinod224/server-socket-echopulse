const supabase = require('../utils/supabase');
async function nuke() {
  console.log('--- NUKING SONGS TABLE ---');
  try {
    const { data, error } = await supabase.from('songs').delete().neq('title', 'XYZ_NEVER_MATCH');
    if (error) {
      console.error('Nuke failed:', error.message);
    } else {
      console.log('Nuke successful! All old content removed.');
    }
  } catch (e) {
    console.error('Nuke catch error:', e.message);
  }
}
nuke().then(() => process.exit(0));

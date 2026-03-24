const axios = require('axios');
async function run() {
  const query = 'Top 50 Malayalam';
  const response = await axios.get(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(query)}&limit=10`);
  const results = response.data?.data?.results || [];
  console.log(JSON.stringify(results.map(s => ({ name: s.name, year: s.year, album: s.album?.name || '?', artist: s.primaryArtists })), null, 2));
}
run();

const axios = require('axios');
async function run() {
  const queries = ['Malayalam 2026', 'Hindi New Releases', 'Latest Tamil 2026'];
  for (const query of queries) {
    const response = await axios.get(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(query)}&limit=5`);
    const results = response.data?.data?.results || [];
    console.log(`Query: ${query}, Count: ${results.length}`);
    if (results.length > 0) {
      console.log(JSON.stringify(results.map(s => ({ name: s.name, year: s.year })), null, 2));
    }
  }
}
run();

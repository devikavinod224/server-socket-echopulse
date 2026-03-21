const axios = require('axios');
async function test() {
  const query = 'Malayalam Songs Trending Now 2024';
  const url = `https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(query)}&limit=5`;
  try {
    const res = await axios.get(url);
    console.log('Results count:', res.data?.data?.results?.length);
    console.log('First result:', res.data?.data?.results?.[0]?.name);
  } catch (e) {
    console.error(e.message);
  }
}
test();

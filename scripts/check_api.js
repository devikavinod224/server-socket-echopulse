const axios = require('axios');
async function check() {
  try {
    const res = await axios.get('http://localhost:3000/api/v1/home');
    const head = res.data.head;
    const firstBodySection = res.data.body[0];
    
    console.log('--- HEAD ITEM ---');
    console.log(JSON.stringify(head[0], null, 2));
    
    console.log('\n--- BODY ITEM ---');
    console.log(JSON.stringify(firstBodySection.items[0], null, 2));
  } catch (e) {
    console.error('API Error:', e.message);
  }
}
check();

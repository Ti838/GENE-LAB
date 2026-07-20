const axios = require('axios');

async function check() {
  const urls = [
    'https://genelab-bioservice.up.railway.app',
    'https://genelab-bioservice.up.railway.app/health/',
    'https://genelab-bioservice.up.railway.app/health'
  ];

  for (const url of urls) {
    try {
      console.log(`Checking ${url}...`);
      const res = await axios.get(url, { timeout: 5000 });
      console.log(`Success:`, res.status, res.data);
    } catch (err) {
      console.error(`Failed:`, err.message, err.response?.data);
    }
  }
}

check();

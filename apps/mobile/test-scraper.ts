
import { fetchLinkMetadata } from './utils/scraper';

async function test() {
  const urls = [
    'https://github.com/napsternxg/TwitterNER',
    'https://www.espncricinfo.com/'
  ];

  for (const url of urls) {
    console.log(`Testing ${url}...`);
    try {
      const meta = await fetchLinkMetadata(url);
      console.log('Result:', JSON.stringify(meta, null, 2));
    } catch (e) {
      console.error('Error:', e);
    }
  }
}

test();

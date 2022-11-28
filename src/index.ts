import chalk from 'chalk';
import { performance } from 'perf_hooks';

import { dataSource } from './datasource';
import { DomainName } from './entity/domain_name.entity';
import { VisitedUrl } from './entity/visited_url.entity';
import { unleakString } from './lib/helpers';
import Crawler, { MAX_SIZE } from './services/crawler';

const srcRegexp = /src="\/?\b([-a-zA-Z0-9@:%_+.~#?&//=]*)"/g;
const hrefRegexp = /href="\/?\b([-a-zA-Z0-9@:%_+.~#?&//=]*)"/g;

const visitedDomains: Record<string, number> = {};

function combineHrefSrc(Url: URL, hrefStr: string) {
  const path = hrefStr.split('"')[1]!;
  if (path.startsWith('https://') || path.startsWith('http://')) return path;
  return `${Url.protocol}//${Url.hostname}${path[0] === '/' ? '' : '/'}${path}`;
}

dataSource.initialize()
  .then(() => {
    console.log('Data Source has been initialized!');
    main();
  }).catch((err) => {
    console.error('Error during Data Source initialization:', err);
  });

let t0 = performance.now();
let t0_10s = performance.now();
let requestCount10s = 0;
let requestPerSec10s = 0;
let requestCountAll = 0;

let urlsToDb: VisitedUrl[] = [];
let domainNamesToDb: DomainName[] = [];

const crawler = new Crawler(
  4000,
  // list urls
  (url, resp) => {
    const body = resp.data as string;
    const Url: URL = new URL(url);
    const urls: string[] = [
      // ...body.match(absoluteUrlRegexp)!,
      ...body.match(srcRegexp)!.map((s) => unleakString(combineHrefSrc(Url, s))),
      ...body.match(hrefRegexp)!.map((s) => unleakString(combineHrefSrc(Url, s))),
    ];
    // .filter((u) => u.startsWith('https://bescosoftware.com') && !u.endsWith('mp4'));
    // .filter((u) => (new URL(u)).hostname.endsWith('.vn'));
    console.log(urls);
    return urls;
  },
  // on crawled
  async (url) => {
    requestCount10s++;
    requestCountAll++;
    const domainName = (new URL(url)).hostname;

    if (!visitedDomains[domainName] || visitedDomains[domainName] < 50) {
      urlsToDb.push({ url });
    }

    if (!visitedDomains[domainName]) {
      visitedDomains[domainName] = (visitedDomains[domainName] || 0) + 1;
      domainNamesToDb.push({ domainName });
      console.log(chalk.green(`${Object.keys(visitedDomains).length} ${domainName}`));
    }
  },
);

async function main() {
  // seed the hash set
  (await dataSource.getRepository(VisitedUrl)
    .createQueryBuilder('visted_url')
    .select().orderBy('RANDOM()')
    .take(MAX_SIZE / 10)
    .getMany())
    .forEach((u) => crawler.urlSet.set(u.url, true));
  (await dataSource.getRepository(DomainName)
    .createQueryBuilder('domain_name')
    .select()
    .getMany())
    .forEach((u) => { visitedDomains[u.domainName] = 1; });

  console.log('Visited URLs boostrapped with', crawler.urlSet.size, 'records.');

  // reset timer
  t0 = performance.now();
  t0_10s = performance.now();

  // seed the starting URL
  const seedUrls = (await dataSource.getRepository(VisitedUrl)
    .createQueryBuilder('visted_url')
    .select().orderBy('RANDOM()')
    .take(MAX_SIZE / 100)
    .getMany())
    .map((u) => u.url);

  seedUrls.push('https://chinhphu.vn');

  console.log('Seed URLs:', seedUrls);

  crawler.run(seedUrls);

  // background jobs

  setInterval(() => {
    requestPerSec10s = requestCount10s / (performance.now() - t0_10s) * 1000;
    requestCount10s = 0;
    t0_10s = performance.now();
  }, 10000);

  setInterval(() => {
    dataSource.getRepository(DomainName).upsert([...domainNamesToDb], ['domainName']);
    domainNamesToDb = [];
    dataSource.getRepository(VisitedUrl).upsert([...urlsToDb], ['url']);
    urlsToDb = [];
  }, 3000);

  setInterval(() => {
    crawler.urlQueue.reverse();

    console.log(
      'running threads:',
      crawler.runningThreads.size,
      '\tpage/s (last 10s):',
      requestPerSec10s.toFixed(2),
      '\tpage/s (all):',
      (requestCountAll / (performance.now() - t0) * 1000).toFixed(2),
    );
  }, 5000);
}

import axios, { AxiosResponse } from 'axios';
import LRU from 'lru-cache';

import { sleep } from '../lib/helpers';

export const MAX_SIZE = 500000;

export default class Crawler {
  urlSet: LRU<string, boolean> = new LRU({
    max: MAX_SIZE,
  });

  urlQueue: string[] = [];

  runningThreads: Set<number> = new Set();

  constructor(
    public numThreads: number,
    public listUrls: (url: string, resp: AxiosResponse<any, any>) => string[],
    public onVisit: (url: string, resp: AxiosResponse<any, any>) => void,
  ) {
  }

  async run(startingUrls: string[]) {
    startingUrls.forEach((url) => this.queueUrlIfNew(url));
    const promises = [];
    for (let i = 0; i < this.numThreads; i++) {
      promises.push(this.runThread(i));
    }
    await Promise.all(promises);
  }

  private async runThread(id: number) {
    while (true) {
      const url = this.urlQueue.pop();
      if (url) {
        this.runningThreads.add(id);

        // fetch URL
        try {
        // eslint-disable-next-line no-await-in-loop
          const resp = await axios.get(url, { decompress: true });
          console.log(resp);
          this.onVisit(url, resp);
          this.listUrls(url, resp).forEach((nextUrl) => this.queueUrlIfNew(nextUrl));
        } catch (e: any) {
          console.error(url, e);
        }
      } else { // wait and check other threads for stop
        this.runningThreads.delete(id);
        if (this.runningThreads.size === 0) {
          return;
        }
        // eslint-disable-next-line no-await-in-loop
        await sleep(500);
      }
    }
  }

  private queueUrlIfNew(url: string) {
    if (this.urlQueue.length > MAX_SIZE) return;
    if (this.urlSet.has(url)) return;
    this.urlSet.set(url, true);
    this.urlQueue.push(url);
  }
}

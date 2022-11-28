import LRUCache from 'lru-cache';

export class LinkService {
  unvisitedUrl: string[];

  seenUrls: LRUCache<string, number>;

  ingest(urls: string[]) {
    urls.forEach((u) => {
      const seenCnt = this.seenUrls.get(u) || 0;
      if (seenCnt === 0) {
        this.unvisitedUrl.push(u);
      }
      this.seenUrls.set(u, seenCnt + 1);
    });
  }

  getUnvisitedBatch(batchSize: number) {
    const startingIndex = Math.max(this.unvisitedUrl.length - batchSize, 0);
    return this.unvisitedUrl.splice(startingIndex, batchSize);
  }
}

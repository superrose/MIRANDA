class BaseScraper {
  constructor(portal) {
    this.portal = portal;
    this.retries = 3;
    this.delayMs = 2000;
  }

  async withRetry(fn) {
    for (let i = 0; i < this.retries; i++) {
      try {
        return await fn();
      } catch (err) {
        console.log(`[${this.portal}] 第 ${i + 1} 次重试...`, err.message);
        if (i === this.retries - 1) throw err;
        await this.delay(this.delayMs * (i + 1));
      }
    }
  }

  delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async search(filters) {
    throw new Error('Not implemented');
  }
}

module.exports = BaseScraper;

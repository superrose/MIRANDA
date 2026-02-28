const PropertyGuruScraper = require('./portals/PropertyGuruScraper');
const NinetyNineScraper = require('./portals/NinetyNineScraper');

class ScraperOrchestrator {
  async searchAll(filters) {
    const scrapers = [
      new PropertyGuruScraper(),
      new NinetyNineScraper()
    ];

    console.log('🔍 开始同时搜索 5 个房产网站...');

    // 每个网站最多等 25 秒，超时就跳过
    const withTimeout = (promise, ms) =>
      Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

    const results = await Promise.allSettled(
      scrapers.map(s => withTimeout(s.search(filters), 25000))
    );

    const allListings = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value || []);

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.log(`⚠️ ${failed.length} 个网站搜索失败`);
    }

    console.log(`✅ 共找到 ${allListings.length} 个房源`);
    return allListings.sort((a, b) => this.scoreRelevance(a, filters) - this.scoreRelevance(b, filters));
  }

  scoreRelevance(listing, filters) {
    const price = parseInt(listing.price?.replace(/[^0-9]/g, '')) || Infinity;
    if (filters.maxBudget && price > filters.maxBudget) return 999;
    return Math.abs(price - (filters.maxBudget || price));
  }
}

module.exports = new ScraperOrchestrator();

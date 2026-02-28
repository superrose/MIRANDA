const PropertyGuruScraper = require('./portals/PropertyGuruScraper');
const NinetyNineScraper = require('./portals/NinetyNineScraper');
const RentlyScraper = require('./portals/RentlyScraper');
const ColiwooScraper = require('./portals/ColiwooScraper');
const CoveScraper = require('./portals/CoveScraper');

class ScraperOrchestrator {
  async searchAll(filters) {
    const scrapers = [
      new PropertyGuruScraper(),
      new NinetyNineScraper(),
      new RentlyScraper(),
      new ColiwooScraper(),
      new CoveScraper()
    ];

    console.log('🔍 开始同时搜索 5 个房产网站...');

    const results = await Promise.allSettled(
      scrapers.map(s => s.search(filters))
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

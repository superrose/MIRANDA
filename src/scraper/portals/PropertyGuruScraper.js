const BaseScraper = require('../BaseScraper');
const { createBrightDataBrowser } = require('../proxy');

class PropertyGuruScraper extends BaseScraper {
  constructor() {
    super('propertyguru');
  }

  async search(filters) {
    return this.withRetry(async () => {
      const browser = await createBrightDataBrowser();
      const page = await browser.newPage();
      await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', route => route.abort());

      try {
        const url = this.buildUrl(filters);
        console.log(`[PropertyGuru] 正在搜索: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        const listings = await page.evaluate(() => {
          const cards = document.querySelectorAll('[data-listing-id], .listing-card, article');
          return [...cards].slice(0, 20).map(el => ({
            title: el.querySelector('h3, h2, .listing-card-title, [class*="title"]')?.innerText?.trim(),
            price: el.querySelector('[class*="price"], .price')?.innerText?.trim(),
            location: el.querySelector('[class*="location"], [class*="address"]')?.innerText?.trim(),
            beds: el.querySelector('[class*="bed"], [class*="room"]')?.innerText?.trim(),
            url: el.querySelector('a')?.href,
            portal: 'PropertyGuru'
          }));
        });

        return listings.filter(l => l.title && l.price);
      } finally {
        await browser.close();
      }
    });
  }

  buildUrl(filters) {
    const base = 'https://www.propertyguru.com.sg/property-for-rent';
    const params = new URLSearchParams();
    if (filters.maxBudget) params.set('maxprice', filters.maxBudget);
    if (filters.minBudget) params.set('minprice', filters.minBudget);
    if (filters.location) params.set('market', filters.location);
    if (filters.beds) params.set('beds', filters.beds);
    return `${base}?${params.toString()}`;
  }
}

module.exports = PropertyGuruScraper;

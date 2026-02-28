const BaseScraper = require('../BaseScraper');
const { createBrightDataBrowser } = require('../proxy');

class NinetyNineScraper extends BaseScraper {
  constructor() {
    super('99co');
  }

  async search(filters) {
    return this.withRetry(async () => {
      const browser = await createBrightDataBrowser();
      const page = await browser.newPage();
      await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', route => route.abort());

      try {
        const url = this.buildUrl(filters);
        console.log(`[99.co] 正在搜索: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        const listings = await page.evaluate(() => {
          const cards = document.querySelectorAll('[class*="listing"], [class*="property-card"], article');
          return [...cards].slice(0, 20).map(el => ({
            title: el.querySelector('h3, h2, [class*="title"]')?.innerText?.trim(),
            price: el.querySelector('[class*="price"]')?.innerText?.trim(),
            location: el.querySelector('[class*="address"], [class*="location"]')?.innerText?.trim(),
            beds: el.querySelector('[class*="bed"], [class*="room"]')?.innerText?.trim(),
            url: el.querySelector('a')?.href,
            portal: '99.co'
          }));
        });

        return listings.filter(l => l.title && l.price);
      } finally {
        await browser.close();
      }
    });
  }

  buildUrl(filters) {
    const base = 'https://www.99.co/singapore/rent';
    const params = new URLSearchParams();
    if (filters.maxBudget) params.set('maxPrice', filters.maxBudget);
    if (filters.minBudget) params.set('minPrice', filters.minBudget);
    if (filters.location) params.set('query', filters.location);
    if (filters.beds) params.set('bedrooms', filters.beds);
    return `${base}?${params.toString()}`;
  }
}

module.exports = NinetyNineScraper;

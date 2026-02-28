const BaseScraper = require('../BaseScraper');
const { createBrightDataBrowser } = require('../proxy');

class ColiwooScraper extends BaseScraper {
  constructor() {
    super('coliwoo');
  }

  async search(filters) {
    return this.withRetry(async () => {
      const browser = await createBrightDataBrowser();
      const page = await browser.newPage();
      await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', route => route.abort());

      try {
        console.log(`[Coliwoo] 正在搜索...`);
        await page.goto('https://coliwoo.com/rooms', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        const listings = await page.evaluate(() => {
          const cards = document.querySelectorAll('[class*="room"], [class*="listing"], [class*="card"]');
          return [...cards].slice(0, 20).map(el => ({
            title: el.querySelector('h3, h2, [class*="title"], [class*="name"]')?.innerText?.trim(),
            price: el.querySelector('[class*="price"], [class*="rent"]')?.innerText?.trim(),
            location: el.querySelector('[class*="location"], [class*="address"]')?.innerText?.trim(),
            url: el.querySelector('a')?.href,
            portal: 'Coliwoo'
          }));
        });

        return listings.filter(l => l.title && l.price);
      } finally {
        await browser.close();
      }
    });
  }
}

module.exports = ColiwooScraper;

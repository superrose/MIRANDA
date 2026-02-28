const BaseScraper = require('../BaseScraper');
const { createBrightDataBrowser } = require('../proxy');

class RentlyScraper extends BaseScraper {
  constructor() {
    super('rently');
  }

  async search(filters) {
    return this.withRetry(async () => {
      const browser = await createBrightDataBrowser();
      const page = await browser.newPage();
      await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', route => route.abort());

      try {
        console.log(`[Rently] 正在搜索...`);
        await page.goto('https://rently.com.sg/listings', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        const listings = await page.evaluate(() => {
          const cards = document.querySelectorAll('[class*="listing"], [class*="card"], article');
          return [...cards].slice(0, 20).map(el => ({
            title: el.querySelector('h3, h2, [class*="title"]')?.innerText?.trim(),
            price: el.querySelector('[class*="price"]')?.innerText?.trim(),
            location: el.querySelector('[class*="location"], [class*="address"]')?.innerText?.trim(),
            beds: el.querySelector('[class*="bed"]')?.innerText?.trim(),
            url: el.querySelector('a')?.href,
            portal: 'Rently'
          }));
        });

        return listings.filter(l => l.title && l.price);
      } finally {
        await browser.close();
      }
    });
  }
}

module.exports = RentlyScraper;

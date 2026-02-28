require('dotenv').config();
const { chromium } = require('playwright');

async function createBrightDataBrowser() {
  const browser = await chromium.launch({
    headless: true,
    proxy: {
      server: `http://${process.env.BRIGHT_DATA_HOST}:${process.env.BRIGHT_DATA_PORT}`,
      username: process.env.BRIGHT_DATA_USERNAME,
      password: process.env.BRIGHT_DATA_PASSWORD,
    }
  });
  return browser;
}

module.exports = { createBrightDataBrowser };

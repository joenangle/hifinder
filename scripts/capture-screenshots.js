#!/usr/bin/env node

/**
 * Capture product screenshots for the landing page.
 * Requires: npm install -D playwright && npx playwright install chromium
 * Usage: npm run capture:screenshots (expects dev server on localhost:3002)
 */

const { chromium } = require('playwright');
const path = require('path');

const BASE_URL =
  process.argv.find((a) => a.startsWith('--url='))?.split('=')[1] ||
  process.env.BASE_URL ||
  'http://localhost:3002';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'screenshots');

const PAGES = [
  {
    name: 'recommendations',
    path: '/recommendations?b=300&want=headphones',
    waitFor: 'main',
  },
  {
    name: 'marketplace',
    path: '/marketplace',
    waitFor: 'main',
  },
  {
    name: 'learn',
    path: '/learn',
    waitFor: 'main',
  },
];

async function capture() {
  console.log(`Capturing screenshots from ${BASE_URL}...`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: 'light',
  });

  for (const page of PAGES) {
    const tab = await context.newPage();
    const url = `${BASE_URL}${page.path}`;
    console.log(`  Capturing ${page.name} (${url})...`);

    await tab.goto(url, { waitUntil: 'networkidle' });

    try {
      await tab.waitForSelector(page.waitFor, { timeout: 10000 });
    } catch {
      console.log(`    Warning: selector "${page.waitFor}" not found, capturing anyway`);
    }

    // Wait for product images on recommendations page
    if (page.name === 'recommendations') {
      await tab.waitForSelector('img[alt]', { timeout: 15000 }).catch(() => {});
    }

    // Hide floating elements that pollute screenshots
    await tab.addStyleTag({
      content:
        '[class*="FloatingBar"], [class*="floating-bar"], [class*="cookie"], [id*="intercom"] { display: none !important; }',
    });

    // Let animations and lazy images settle
    await tab.waitForTimeout(2500);

    const outputPath = path.join(OUTPUT_DIR, `${page.name}.png`);
    await tab.screenshot({ path: outputPath, fullPage: false });

    console.log(`    Saved ${outputPath}`);
    await tab.close();
  }

  await browser.close();
  console.log('Done!');
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});

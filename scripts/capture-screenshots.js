#!/usr/bin/env node

/**
 * Capture product screenshots for the landing page in both light and dark
 * theme variants.
 *
 * Requires: playwright + cwebp (brew install webp)
 * Usage:    npm run capture:screenshots  (expects dev server on localhost:3002)
 *
 * Outputs: public/images/screenshots/{name}-{theme}.webp
 */

const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_URL =
  process.argv.find((a) => a.startsWith('--url='))?.split('=')[1] ||
  process.env.BASE_URL ||
  'http://localhost:3002';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'screenshots');

// NOTE: /gear?tab=stacks requires authentication; the unauthenticated view is
// just a sign-in wall. The `stacks.webp` preview on the landing page is captured
// manually from a signed-in session and committed separately. If you need to
// refresh it, sign in, open devtools, and screenshot the page yourself.
const PAGES = [
  {
    name: 'recommendations',
    path: '/recommendations?b=300&want=headphones',
    waitFor: 'main',
    waitForImages: true,
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

const THEMES = ['light', 'dark'];

async function capture() {
  console.log(`Capturing screenshots from ${BASE_URL}...`);

  const browser = await chromium.launch();

  for (const theme of THEMES) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
      colorScheme: theme,
    });

    // Persist theme via localStorage so the app's pre-hydration script
    // sets data-theme correctly before first paint.
    await context.addInitScript((t) => {
      try { localStorage.setItem('theme', t); } catch {}
    }, theme);

    for (const page of PAGES) {
      const tab = await context.newPage();
      const url = `${BASE_URL}${page.path}`;
      console.log(`  [${theme}] ${page.name} (${url})...`);

      await tab.goto(url, { waitUntil: 'networkidle' });

      try {
        await tab.waitForSelector(page.waitFor, { timeout: 10000 });
      } catch {
        console.log(`    Warning: selector "${page.waitFor}" not found, capturing anyway`);
      }

      if (page.waitForImages) {
        await tab.waitForSelector('img[alt]', { timeout: 15000 }).catch(() => {});
      }

      // Hide floating elements that pollute screenshots
      await tab.addStyleTag({
        content:
          '[class*="FloatingBar"], [class*="floating-bar"], [class*="cookie"], [id*="intercom"] { display: none !important; }',
      });

      // Let animations and lazy images settle
      await tab.waitForTimeout(2500);

      const pngPath = path.join(OUTPUT_DIR, `${page.name}-${theme}.png`);
      await tab.screenshot({ path: pngPath, fullPage: false });

      const webpPath = pngPath.replace(/\.png$/, '.webp');
      execSync(`cwebp -q 82 "${pngPath}" -o "${webpPath}"`, { stdio: 'ignore' });
      fs.unlinkSync(pngPath);
      console.log(`    Saved ${path.basename(webpPath)}`);

      await tab.close();
    }

    await context.close();
  }

  await browser.close();
  console.log('Done!');
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});

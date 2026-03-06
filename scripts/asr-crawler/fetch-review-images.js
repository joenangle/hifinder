#!/usr/bin/env node

/**
 * Fetch ASR review measurement dashboard images for OCR-based SINAD extraction.
 *
 * Usage:
 *   node scripts/asr-crawler/fetch-review-images.js
 *
 * Reads review-urls-v2.txt, downloads measurement dashboard images to output/images/,
 * and writes a manifest of what was found.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const URLS_FILE = path.join(__dirname, 'review-urls-v2.txt');
const OUTPUT_DIR = path.join(__dirname, 'output', 'images');
const MANIFEST_FILE = path.join(__dirname, 'output', 'image-manifest.json');

// Delay between requests to be polite
const DELAY_MS = 2000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HiFinder/1.0)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => resolve({ body: Buffer.concat(data), contentType: res.headers['content-type'] }));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  // Read URLs
  const content = fs.readFileSync(URLS_FILE, 'utf-8');
  const entries = content.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => {
      const [url, ...rest] = line.split('|').map(s => s.trim());
      const dbName = rest.join('|').trim() || null;
      return { url, dbName };
    });

  console.log(`Found ${entries.length} review URLs to process\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const manifest = [];

  for (const entry of entries) {
    console.log(`Fetching: ${entry.url}`);
    try {
      const { body: htmlBuf } = await fetchUrl(entry.url);
      const html = htmlBuf.toString('utf-8');

      // Find measurement dashboard images (lazy-loaded data-src attributes)
      const dataSrcPattern = /data-src="(https:\/\/www\.audiosciencereview\.com\/forum\/index\.php\?attachments\/[^"]+)"/g;
      const allAttachments = [];
      let match;
      while ((match = dataSrcPattern.exec(html)) !== null) {
        allAttachments.push(match[1]);
      }

      // Find the main measurement/dashboard image
      // Priority: "measurements" keyword, then "dashboard" keyword
      const measurementImg = allAttachments.find(u =>
        u.toLowerCase().includes('measurement') && !u.toLowerCase().includes('filter') &&
        !u.toLowerCase().includes('jitter') && !u.toLowerCase().includes('linearity') &&
        !u.toLowerCase().includes('multitone') && !u.toLowerCase().includes('frequency') &&
        !u.toLowerCase().includes('dynamic') && !u.toLowerCase().includes('vs-level') &&
        !u.toLowerCase().includes('vs-frequency') && !u.toLowerCase().includes('crosstalk')
      ) || allAttachments.find(u => u.toLowerCase().includes('dashboard'));

      if (!measurementImg) {
        console.log(`  No measurement dashboard image found (${allAttachments.length} attachments total)`);
        // Try first attachment with png that looks like a measurement
        const fallback = allAttachments.find(u => u.includes('-png.') || u.includes('-jpg.'));
        if (fallback) {
          console.log(`  Fallback: trying first image attachment`);
        }
        manifest.push({ ...entry, imageUrl: null, localPath: null, attachmentCount: allAttachments.length });
        await sleep(DELAY_MS);
        continue;
      }

      // Download the image
      const slug = entry.url.match(/threads\/([^/]+)/)?.[1] || 'unknown';
      const ext = measurementImg.includes('-png.') ? 'png' : 'jpg';
      const filename = `${slug}-sinad.${ext}`;
      const localPath = path.join(OUTPUT_DIR, filename);

      console.log(`  Downloading measurement image...`);
      const { body: imgBuf } = await fetchUrl(measurementImg);
      fs.writeFileSync(localPath, imgBuf);
      console.log(`  Saved: ${filename} (${Math.round(imgBuf.length / 1024)}KB)`);

      manifest.push({ ...entry, imageUrl: measurementImg, localPath: filename, attachmentCount: allAttachments.length });
    } catch (err) {
      console.log(`  Error: ${err.message}`);
      manifest.push({ ...entry, imageUrl: null, localPath: null, error: err.message });
    }

    await sleep(DELAY_MS);
  }

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest written to ${MANIFEST_FILE}`);
  console.log(`Images downloaded: ${manifest.filter(m => m.localPath).length}/${entries.length}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

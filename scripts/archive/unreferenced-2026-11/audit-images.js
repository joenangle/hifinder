#!/usr/bin/env node
// Quick image audit: generates an HTML page with a random sample of product images
// Usage: node scripts/audit-images.js [sample-pct]  (default: 10%)

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const samplePct = parseInt(process.argv[2] || '10', 10)

async function main() {
  const { data: all } = await supabase
    .from('components')
    .select('brand, name, category, image_url, price_new')
    .not('image_url', 'is', null)
    .order('category')

  if (!all || all.length === 0) {
    console.log('No components with images found')
    return
  }

  // Random sample
  const sampleSize = Math.max(1, Math.round(all.length * samplePct / 100))
  const shuffled = all.sort(() => Math.random() - 0.5)
  const sample = shuffled.slice(0, sampleSize)

  // Group by category
  const grouped = {}
  for (const item of sample) {
    const cat = item.category
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>HiFinder Image Audit (${sampleSize} of ${all.length}, ${samplePct}%)</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, system-ui, sans-serif; background: #1a1a1a; color: #e0e0e0; padding: 24px; }
  h1 { margin-bottom: 8px; font-size: 20px; }
  .stats { color: #888; margin-bottom: 24px; font-size: 14px; }
  h2 { margin: 24px 0 12px; font-size: 16px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; border-bottom: 1px solid #333; padding-bottom: 4px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  .card { background: #252525; border-radius: 8px; overflow: hidden; border: 1px solid #333; }
  .card:hover { border-color: #555; }
  .card img { width: 100%; height: 160px; object-fit: contain; background: #2a2a2a; padding: 8px; }
  .card .info { padding: 8px 10px; }
  .card .name { font-size: 13px; font-weight: 600; }
  .card .brand { font-size: 12px; color: #888; }
  .card .price { font-size: 11px; color: #666; margin-top: 2px; }
  .card .flag { display: none; }
  .card.flagged { border-color: #e53e3e; }
  .card.flagged .flag { display: block; color: #e53e3e; font-size: 11px; font-weight: 600; margin-top: 4px; }
  .controls { position: sticky; top: 0; background: #1a1a1a; padding: 8px 0 16px; z-index: 10; display: flex; gap: 12px; align-items: center; }
  button { padding: 6px 14px; border-radius: 6px; border: 1px solid #444; background: #333; color: #e0e0e0; cursor: pointer; font-size: 13px; }
  button:hover { background: #444; }
  .count { font-size: 13px; color: #888; }
</style>
</head>
<body>
<h1>Image Audit</h1>
<div class="stats">${sampleSize} random samples from ${all.length} total (${samplePct}%) &mdash; click any card to flag it as wrong</div>
<div class="controls">
  <button onclick="document.querySelectorAll('.card.flagged').forEach(c=>{c.scrollIntoView();return})">Jump to flagged</button>
  <button onclick="copyFlagged()">Copy flagged names</button>
  <span class="count" id="flagCount">0 flagged</span>
</div>
${Object.entries(grouped).map(([cat, items]) => `
<h2>${cat} (${items.length})</h2>
<div class="grid">
${items.map(item => `
  <div class="card" onclick="this.classList.toggle('flagged'); updateCount()">
    <img src="${item.image_url}" alt="${item.brand} ${item.name}" loading="lazy">
    <div class="info">
      <div class="name">${item.name}</div>
      <div class="brand">${item.brand}</div>
      <div class="price">${item.price_new ? '$' + item.price_new : ''}</div>
      <div class="flag">FLAGGED</div>
    </div>
  </div>
`).join('')}
</div>
`).join('')}
<script>
function updateCount() {
  const n = document.querySelectorAll('.card.flagged').length;
  document.getElementById('flagCount').textContent = n + ' flagged';
}
function copyFlagged() {
  const names = [...document.querySelectorAll('.card.flagged .name')].map(el => el.textContent);
  navigator.clipboard.writeText(names.join('\\n'));
  alert('Copied ' + names.length + ' flagged items');
}
</script>
</body>
</html>`

  const outPath = path.join(__dirname, '..', 'data', 'image-audit.html')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, html)
  console.log(`Audit page: ${outPath}`)
  console.log(`${sampleSize} of ${all.length} images (${samplePct}%)`)
  console.log(`Open: open ${outPath}`)
}

main().catch(console.error)

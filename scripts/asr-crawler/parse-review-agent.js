#!/usr/bin/env node

/**
 * ASR Review Parser Agent
 *
 * This script launches a Claude agent to parse an ASR review thread
 * and extract structured component data.
 *
 * The agent reads the review like a human would and extracts:
 * - Brand and model name
 * - Category (DAC, amp, combo, headphones, IEMs)
 * - SINAD measurement
 * - Price
 * - Power output (for amps)
 * - Other relevant specifications
 *
 * Usage:
 *   node scripts/asr-crawler/parse-review-agent.js <review_url>
 */

const https = require('https');
const http = require('http');

async function fetchReviewContent(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    client.get(url, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    }).on('error', reject);
  });
}

function extractTextFromHTML(html) {
  // Simple HTML text extraction (remove tags)
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function parseReviewWithAI(url) {
  console.log(`\n🤖 Launching AI agent to parse: ${url}\n`);

  // Fetch the review page
  console.log('📥 Fetching review content...');
  const html = await fetchReviewContent(url);
  const text = extractTextFromHTML(html);

  // Truncate to first 10,000 characters (early posts have the key data)
  const reviewExcerpt = text.substring(0, 10000);

  console.log('✓ Content fetched\n');
  console.log('📋 Review excerpt (first 500 chars):');
  console.log('─'.repeat(60));
  console.log(reviewExcerpt.substring(0, 500) + '...');
  console.log('─'.repeat(60));
  console.log('');

  // Prompt for the AI agent
  const agentPrompt = `
You are parsing an Audio Science Review (ASR) forum post to extract structured component data.

Here is the review content:

${reviewExcerpt}

Please extract the following information in JSON format:

{
  "brand": "Manufacturer name (e.g., Topping, Schiit, Benchmark)",
  "name": "Model name (e.g., D90, Magnius, HPA4)",
  "category": "dac|amp|dac_amp|headphones|iems",
  "asr_sinad": "SINAD measurement in dB (e.g., 121.5)",
  "price_new": "MSRP or retail price in USD (integer, e.g., 499)",
  "power_output": "For amps: power specs (e.g., '2W @ 32Ω')",
  "asr_review_url": "${url}"
}

Rules:
- Only extract data explicitly mentioned in the review
- Use null for missing data
- SINAD is the most important measurement
- Category should be one of: dac, amp, dac_amp, headphones, iems
- For combo units (DAC + Amp), use category "dac_amp"
- Return ONLY the JSON object, no explanation

If you cannot extract component data, return: {"error": "Could not parse review"}
`;

  console.log('🔍 AI Agent Task:');
  console.log('   Extract: brand, model, category, SINAD, price, specs');
  console.log('   Review length: ~' + Math.round(reviewExcerpt.length / 1000) + 'k characters');
  console.log('');

  console.log('⚠️  NOTE: This is a placeholder implementation.');
  console.log('   To fully implement, this script needs to:');
  console.log('   1. Use Claude Code\'s Task tool to launch an agent');
  console.log('   2. Pass the review content to the agent');
  console.log('   3. Receive structured JSON response');
  console.log('');
  console.log('   For now, returning mock data for demonstration...\n');

  // Mock response for demonstration
  return {
    brand: "Topping",
    name: "D90 (mock data)",
    category: "dac",
    asr_sinad: 123,
    price_new: 699,
    power_output: null,
    asr_review_url: url
  };
}

// Main execution
async function main() {
  const url = process.argv[2];

  if (!url) {
    console.error('Usage: node parse-review-agent.js <review_url>');
    process.exit(1);
  }

  try {
    const component = await parseReviewWithAI(url);
    console.log('✅ Extraction complete!\n');
    console.log(JSON.stringify(component, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseReviewWithAI };

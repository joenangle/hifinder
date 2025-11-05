#!/usr/bin/env node

/**
 * CSS Size Analyzer
 * Tracks CSS bundle size over time and alerts on significant increases
 *
 * Usage:
 *   node scripts/analyze-css-size.js [--threshold=10]
 *
 * Options:
 *   --threshold  Percentage increase to warn about (default: 10)
 *   --json       Output JSON format for CI integration
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BUILD_STATS_DIR = path.join(process.cwd(), '.build-stats');
const STATS_FILE = path.join(BUILD_STATS_DIR, 'css-sizes.json');
const NEXT_BUILD_DIR = path.join(process.cwd(), '.next');
const THRESHOLD_PERCENT = parseFloat(process.argv.find(arg => arg.startsWith('--threshold='))?.split('=')[1] || '10');
const JSON_OUTPUT = process.argv.includes('--json');

/**
 * Extract CSS size from Next.js build output
 */
function extractCssSizeFromBuildOutput() {
  try {
    const chunksDir = path.join(NEXT_BUILD_DIR, 'static', 'chunks');

    if (!fs.existsSync(chunksDir)) {
      console.error('❌ Build chunks directory not found. Run `npm run build` first.');
      process.exit(1);
    }

    // Recursively find all CSS files
    function findCssFiles(dir, fileList = []) {
      const files = fs.readdirSync(dir);

      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          findCssFiles(filePath, fileList);
        } else if (file.endsWith('.css')) {
          fileList.push(filePath);
        }
      });

      return fileList;
    }

    const cssFiles = findCssFiles(chunksDir);

    // Calculate total CSS size
    let totalSize = 0;
    const fileDetails = [];

    cssFiles.forEach(filePath => {
      const stats = fs.statSync(filePath);
      const relativePath = path.relative(NEXT_BUILD_DIR, filePath);

      totalSize += stats.size;
      fileDetails.push({
        file: relativePath,
        size: stats.size,
        sizeKb: (stats.size / 1024).toFixed(2)
      });
    });

    // Sort by size (largest first)
    fileDetails.sort((a, b) => b.size - a.size);

    return {
      totalSize,
      totalSizeKb: (totalSize / 1024).toFixed(2),
      files: fileDetails,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error extracting CSS size:', error.message);
    process.exit(1);
  }
}

/**
 * Load historical stats
 */
function loadHistoricalStats() {
  if (!fs.existsSync(STATS_FILE)) {
    return [];
  }

  try {
    const data = fs.readFileSync(STATS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('⚠️  Error loading historical stats:', error.message);
    return [];
  }
}

/**
 * Save stats to file
 */
function saveStats(newStats, history) {
  // Ensure directory exists
  if (!fs.existsSync(BUILD_STATS_DIR)) {
    fs.mkdirSync(BUILD_STATS_DIR, { recursive: true });
  }

  // Keep last 30 builds
  const updatedHistory = [...history, newStats].slice(-30);

  fs.writeFileSync(STATS_FILE, JSON.stringify(updatedHistory, null, 2));
}

/**
 * Format size for display
 */
function formatSize(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

/**
 * Calculate percentage change
 */
function calculateChange(current, previous) {
  if (!previous) return null;

  const change = current - previous;
  const percentChange = ((change / previous) * 100).toFixed(2);

  return {
    absolute: change,
    percent: parseFloat(percentChange),
    direction: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'unchanged'
  };
}

/**
 * Display results in console
 */
function displayResults(current, history) {
  const previous = history[history.length - 1];
  const change = calculateChange(current.totalSize, previous?.totalSize);

  console.log('\n📊 CSS Size Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Current:  ${formatSize(current.totalSize)}`);

  if (previous) {
    console.log(`Previous: ${formatSize(previous.totalSize)}`);

    if (change && change.direction === 'increase') {
      const emoji = change.percent > THRESHOLD_PERCENT ? '⚠️ ' : '📈';
      console.log(`Change:   +${formatSize(change.absolute)} (+${change.percent}%) ${emoji}`);

      if (change.percent > THRESHOLD_PERCENT) {
        console.log(`\n⚠️  CSS size increased by ${change.percent}% (threshold: ${THRESHOLD_PERCENT}%)`);
      }
    } else if (change.direction === 'decrease') {
      console.log(`Change:   ${formatSize(change.absolute)} (${change.percent}%) ✅`);
    } else {
      console.log(`Change:   No change ✅`);
    }
  }

  // Show detailed file breakdown
  if (current.files.length > 0) {
    console.log('\n📁 CSS Files:');
    current.files.forEach(file => {
      console.log(`  • ${file.file}: ${file.sizeKb} kB`);
    });
  }

  // Show historical trend (last 5 builds)
  if (history.length > 0) {
    console.log('\n📈 Historical Trend (last 5 builds):');
    const recent = [...history.slice(-4), current];

    recent.forEach((stat, index) => {
      const date = new Date(stat.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      const isCurrent = index === recent.length - 1;
      const marker = isCurrent ? ' ← current' : '';
      console.log(`  ${date}: ${formatSize(stat.totalSize)}${marker}`);
    });

    // Calculate total change since oldest record
    if (recent.length > 1) {
      const oldest = recent[0];
      const totalChange = calculateChange(current.totalSize, oldest.totalSize);

      if (totalChange) {
        console.log(`\nTotal change: ${formatSize(totalChange.absolute)} (${totalChange.percent}%) since ${new Date(oldest.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
      }
    }
  }

  console.log('');
}

/**
 * Output JSON format for CI
 */
function outputJson(current, history) {
  const previous = history[history.length - 1];
  const change = calculateChange(current.totalSize, previous?.totalSize);

  const output = {
    current: {
      size: current.totalSize,
      sizeKb: current.totalSizeKb,
      files: current.files
    },
    previous: previous ? {
      size: previous.totalSize,
      sizeKb: previous.totalSizeKb
    } : null,
    change: change || null,
    threshold: THRESHOLD_PERCENT,
    exceedsThreshold: change ? change.percent > THRESHOLD_PERCENT : false,
    timestamp: current.timestamp
  };

  console.log(JSON.stringify(output, null, 2));
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Analyzing CSS bundle size...\n');

  // Extract current CSS size
  const currentStats = extractCssSizeFromBuildOutput();

  // Load historical data
  const history = loadHistoricalStats();

  // Save current stats
  saveStats(currentStats, history);

  // Display results
  if (JSON_OUTPUT) {
    outputJson(currentStats, history);
  } else {
    displayResults(currentStats, history);
  }

  // Exit with error code if threshold exceeded
  const previous = history[history.length - 1];
  const change = calculateChange(currentStats.totalSize, previous?.totalSize);

  if (change && change.percent > THRESHOLD_PERCENT) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { extractCssSizeFromBuildOutput, calculateChange };

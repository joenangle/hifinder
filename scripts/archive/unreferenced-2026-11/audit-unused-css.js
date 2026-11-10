#!/usr/bin/env node

/**
 * Audit Unused CSS Classes
 * Finds custom CSS classes that are defined but never used in components
 *
 * Usage:
 *   node scripts/audit-unused-css.js [--verbose]
 */

const fs = require('fs');
const path = require('path');

const VERBOSE = process.argv.includes('--verbose');

// Paths
const CSS_FILE = path.join(process.cwd(), 'src/styles/design-system-components.css');
const SRC_DIR = path.join(process.cwd(), 'src');

/**
 * Extract class names from CSS file
 */
function extractCssClasses(cssContent) {
  const classPattern = /^\s*\.([a-zA-Z0-9_-]+(?:\\:[a-zA-Z0-9_-]+)?)\s*[{,]/gm;
  const classes = new Set();
  let match;

  while ((match = classPattern.exec(cssContent)) !== null) {
    let className = match[1];

    // Skip pseudo-selectors and special cases
    if (className.includes(':') || className.includes('\\')) {
      continue;
    }

    // Skip data attributes and element selectors
    if (className.startsWith('[') || !className.match(/^[a-zA-Z]/)) {
      continue;
    }

    classes.add(className);
  }

  return Array.from(classes).sort();
}

/**
 * Search for class usage in source files
 */
function searchClassUsage(className, srcDir) {
  const usages = [];

  function searchDir(dir) {
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules and other non-source directories
        if (!entry.startsWith('.') && entry !== 'node_modules' && entry !== '.next') {
          searchDir(fullPath);
        }
      } else if (entry.match(/\.(tsx?|jsx?)$/)) {
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Search for className usage (basic pattern)
        const classNamePattern = new RegExp(`className\\s*=\\s*["\`][^"\`]*\\b${className}\\b[^"\`]*["\`]`, 'g');
        const templatePattern = new RegExp(`className\\s*=\\s*{[^}]*\\b${className}\\b[^}]*}`, 'g');

        if (classNamePattern.test(content) || templatePattern.test(content)) {
          usages.push(path.relative(process.cwd(), fullPath));
        }
      }
    }
  }

  searchDir(srcDir);
  return usages;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Auditing unused CSS classes...\n');

  // Read CSS file
  if (!fs.existsSync(CSS_FILE)) {
    console.error('❌ CSS file not found:', CSS_FILE);
    process.exit(1);
  }

  const cssContent = fs.readFileSync(CSS_FILE, 'utf-8');
  const classes = extractCssClasses(cssContent);

  console.log(`Found ${classes.length} custom CSS classes to audit\n`);

  // Check each class
  const unused = [];
  const used = [];

  console.log('Searching for class usage in components...');
  classes.forEach((className, index) => {
    const usages = searchClassUsage(className, SRC_DIR);

    if (usages.length === 0) {
      unused.push(className);
    } else {
      used.push({ className, count: usages.length, files: usages });
    }

    // Progress indicator
    if ((index + 1) % 10 === 0 || index === classes.length - 1) {
      process.stdout.write(`\r  Checked ${index + 1}/${classes.length} classes...`);
    }
  });

  console.log('\n');

  // Display results
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Audit Results\n');

  if (unused.length > 0) {
    console.log(`⚠️  Found ${unused.length} potentially unused classes:\n`);
    unused.forEach(className => {
      console.log(`  • .${className}`);
    });
  } else {
    console.log('✅ All custom CSS classes are in use!');
  }

  console.log(`\n✅ ${used.length} classes are actively used`);

  // Verbose mode: show most-used classes
  if (VERBOSE && used.length > 0) {
    console.log('\n📈 Most used classes:');
    used
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .forEach(({ className, count, files }) => {
        console.log(`\n  .${className} (${count} files)`);
        if (files.length <= 3) {
          files.forEach(file => console.log(`    - ${file}`));
        } else {
          files.slice(0, 3).forEach(file => console.log(`    - ${file}`));
          console.log(`    ... and ${files.length - 3} more`);
        }
      });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Summary recommendations
  if (unused.length > 0) {
    console.log('💡 Recommendations:');
    console.log('   1. Review unused classes - they may be legacy code');
    console.log('   2. Check if they\'re used in archived components');
    console.log('   3. Consider removing to reduce CSS bundle size');
    console.log('   4. Some classes may be dynamically generated (check template literals)\n');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { extractCssClasses, searchClassUsage };

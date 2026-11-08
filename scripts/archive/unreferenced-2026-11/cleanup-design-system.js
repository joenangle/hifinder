#!/usr/bin/env node

/**
 * Clean up design-system.css to remove Tailwind utility class duplicates
 * Keep: CSS variables, custom component styles
 * Remove: Utility classes that Tailwind already provides
 */

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../src/styles/design-system.css');
const outputFile = path.join(__dirname, '../src/styles/design-system-cleaned.css');

const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');

// Sections to KEEP (line ranges)
const keepSections = [
  { start: 0, end: 814, name: 'CSS Variables and Custom Components' }, // Everything up to "Text Utilities"
];

// Find where utility classes start (they should be removed)
const utilityStartMarkers = [
  '/* Text Utilities */',
  '/* Spacing Utilities */',
  '/* Display Utilities */',
  '/* Width and Height Utilities */',
  '/* Flex Utilities */',
  '/* Border Utilities */',
  '/* Background Utilities */',
];

let utilityStartLine = null;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '/* Text Utilities */') {
    utilityStartLine = i;
    break;
  }
}

if (utilityStartLine === null) {
  console.error('Could not find utility classes section');
  process.exit(1);
}

console.log(`Found utility classes starting at line ${utilityStartLine + 1}`);

// Keep everything before utility classes
const cleanedLines = lines.slice(0, utilityStartLine);

// Add a note at the end
cleanedLines.push('');
cleanedLines.push('/**');
cleanedLines.push(' * Utility classes (text, spacing, display, width/height, flex, border, background)');
cleanedLines.push(' * are now provided by Tailwind CSS via @import "tailwindcss" in globals.css');
cleanedLines.push(' * ');
cleanedLines.push(' * This file now contains only:');
cleanedLines.push(' * - CSS custom properties (variables) for theming');
cleanedLines.push(' * - Custom component styles (cards, buttons, forms, navigation)');
cleanedLines.push(' * - Project-specific overrides');
cleanedLines.push(' */');
cleanedLines.push('');

const cleaned = cleanedLines.join('\n');

fs.writeFileSync(outputFile, cleaned, 'utf8');

console.log(`✅ Cleaned CSS written to: ${outputFile}`);
console.log(`📊 Original: ${lines.length} lines`);
console.log(`📊 Cleaned: ${cleanedLines.length} lines`);
console.log(`📊 Removed: ${lines.length - cleanedLines.length} lines of utility classes`);
console.log('');
console.log('Next steps:');
console.log('1. Review the cleaned file');
console.log('2. Replace src/styles/design-system.css with design-system-cleaned.css');
console.log('3. Test your app to ensure styles still work');

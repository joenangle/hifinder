#!/usr/bin/env node

/**
 * Split design-system.css into CSS variables and custom components
 * Remove utility class overrides that conflict with Tailwind
 */

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../src/styles/design-system.css');
const variablesFile = path.join(__dirname, '../src/styles/design-system-variables.css');
const componentsFile = path.join(__dirname, '../src/styles/design-system-components.css');

const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');

// Find where utility classes start
let utilityStartLine = null;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '/* Text Utilities */') {
    utilityStartLine = i;
    break;
  }
}

console.log(`📊 Total lines: ${lines.length}`);
console.log(`📍 Utility classes start at line: ${utilityStartLine + 1}`);

// Extract CSS Variables (lines 1 through line before utilities)
const variablesLines = lines.slice(0, utilityStartLine);
const variablesContent = variablesLines.join('\n');

fs.writeFileSync(variablesFile, variablesContent, 'utf8');
console.log(`✅ Created ${variablesFile} (${variablesLines.length} lines)`);

// Extract Custom Components (everything after utilities section)
// We need to find where custom component styles start (after utility section ends)
let componentStartLine = null;
for (let i = utilityStartLine; i < lines.length; i++) {
  // Look for custom classes that aren't utilities
  // Custom components typically have comments like "/* Cards */" or specific class names
  if (lines[i].includes('/* Skip Link */') ||
      lines[i].includes('/* Modal System */') ||
      lines[i].includes('/* Tooltip */')) {
    componentStartLine = i;
    break;
  }
}

if (componentStartLine) {
  const componentLines = lines.slice(componentStartLine);
  const componentsContent = componentLines.join('\n');

  fs.writeFileSync(componentsFile, componentsContent, 'utf8');
  console.log(`✅ Created ${componentsFile} (${componentLines.length} lines)`);
  console.log(`🗑️  Skipped utility classes: lines ${utilityStartLine + 1} - ${componentStartLine}`);
} else {
  // If no custom components found, create empty file
  fs.writeFileSync(componentsFile, '/* Custom component styles */\n', 'utf8');
  console.log(`✅ Created empty ${componentsFile}`);
}

console.log('\n📋 Summary:');
console.log(`Variables: ${variablesLines.length} lines (CSS custom properties)`);
console.log(`Components: ${componentStartLine ? lines.length - componentStartLine : 0} lines (custom classes)`);
console.log(`Removed: ${componentStartLine ? componentStartLine - utilityStartLine : lines.length - utilityStartLine} lines (utility overrides)`);
console.log('\n✨ Files created successfully!');
console.log('\nNext steps:');
console.log('1. Review the new files');
console.log('2. Update src/app/globals.css to use @layer imports');
console.log('3. Test the site');

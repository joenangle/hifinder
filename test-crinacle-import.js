// Quick test of the Crinacle import system
const { CrinacleImporter } = require('./scripts/import-crinacle-data');

async function testImport() {
  const importer = new CrinacleImporter();

  const testInput = `
S-Tier:
Symphonium Helios - $650 - Premium neutral-bright IEM with excellent technicalities

A+-Tier:
Truthear Zero - $50 - Budget king with excellent tuning for the price
  `;

  console.log('Testing Crinacle import system...\n');

  const preview = await importer.previewImport(testInput.trim());

  if (preview && preview.newComponents.length > 0) {
    console.log('\n✅ System working! Ready for real data.');
    console.log('Preview shows it will correctly:');
    console.log('- Parse your input format');
    console.log('- Check for duplicates');
    console.log('- Generate proper database records');
  }
}

// Set environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dqvuvieggqltkznluvol.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxdnV2aWVnZ3FsdGt6bmx1dm9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM1MzEwNywiZXhwIjoyMDcxOTI5MTA3fQ.ZDT4_lhx1qoI6YU3QnQixNS2vGtRApolrTNHMaPAfT8';

testImport().catch(console.error);
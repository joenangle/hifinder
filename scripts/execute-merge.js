const { createClient } = require('@supabase/supabase-js');
const { detectTrueDuplicates, generateMergeStrategy } = require('./detect-duplicates-improved');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Execute a single merge operation
async function executeMerge(mergeStrategy) {
  const { canonical, toDelete, mergedData } = mergeStrategy;

  console.log(`🔄 Merging ${canonical.brand} ${canonical.name}...`);
  console.log(`   Keeping: ${canonical.id}`);
  console.log(`   Deleting: ${toDelete.map(item => item.id).join(', ')}`);

  try {
    // Start a transaction-like operation
    const deleteIds = toDelete.map(item => item.id);

    // 1. Update the canonical entry with merged data
    const { error: updateError } = await supabase
      .from('components')
      .update({
        price_new: mergedData.price_new,
        price_used_min: mergedData.price_used_min,
        price_used_max: mergedData.price_used_max,
        why_recommended: mergedData.why_recommended,
        impedance: mergedData.impedance,
        sensitivity: mergedData.sensitivity,
        sound_signature: mergedData.sound_signature,
        image_url: mergedData.image_url,
        amazon_url: mergedData.amazon_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', canonical.id);

    if (updateError) {
      throw new Error(`Failed to update canonical entry: ${updateError.message}`);
    }

    // 2. Delete duplicate entries
    const { error: deleteError } = await supabase
      .from('components')
      .delete()
      .in('id', deleteIds);

    if (deleteError) {
      throw new Error(`Failed to delete duplicates: ${deleteError.message}`);
    }

    console.log(`   ✅ Successfully merged! Updated 1, deleted ${deleteIds.length}`);

    return {
      success: true,
      canonical: canonical.id,
      deleted: deleteIds,
      updated: mergedData
    };

  } catch (error) {
    console.log(`   ❌ Merge failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      canonical: canonical.id,
      attempted_deletes: toDelete.map(item => item.id)
    };
  }
}

// Execute all merges with safety checks
async function executeAllMerges(dryRun = true) {
  try {
    console.log('🚀 Starting database cleanup...\n');

    // Get current duplicate analysis
    const report = await detectTrueDuplicates();
    const exactDuplicates = report.exactDuplicates;

    if (exactDuplicates.length === 0) {
      console.log('✨ No duplicates found! Database is clean.');
      return;
    }

    console.log(`📋 Found ${exactDuplicates.length} duplicate groups to merge`);
    console.log(`📊 Will delete ${exactDuplicates.reduce((sum, g) => sum + g.count - 1, 0)} duplicate entries\n`);

    if (dryRun) {
      console.log('🧪 DRY RUN MODE - No actual changes will be made\n');
      console.log('Preview of operations:');
      console.log('═══════════════════════');

      exactDuplicates.forEach((group, index) => {
        const strategy = generateMergeStrategy(group);
        if (strategy.strategy === 'merge') {
          console.log(`${index + 1}. ${strategy.canonical.brand} ${strategy.canonical.name}`);
          console.log(`   Keep: ${strategy.canonical.id}`);
          console.log(`   Delete: ${strategy.toDelete.map(item => item.id).join(', ')}`);
        }
      });

      console.log(`\n🔍 To execute these changes, run:`);
      console.log(`node scripts/execute-merge.js --execute`);
      return;
    }

    // Execute merges
    console.log('⚡ EXECUTING MERGES');
    console.log('═══════════════════');

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < exactDuplicates.length; i++) {
      const group = exactDuplicates[i];
      const strategy = generateMergeStrategy(group);

      if (strategy.strategy === 'merge') {
        const result = await executeMerge(strategy);
        results.push(result);

        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }

        // Add a small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Final summary
    console.log('\n📊 MERGE SUMMARY');
    console.log('═══════════════');
    console.log(`✅ Successful merges: ${successCount}`);
    console.log(`❌ Failed merges: ${errorCount}`);
    console.log(`🗑️  Total entries deleted: ${results.filter(r => r.success).reduce((sum, r) => sum + r.deleted.length, 0)}`);

    if (errorCount > 0) {
      console.log('\n❌ ERRORS:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`   ${result.canonical}: ${result.error}`);
      });
    }

    // Save merge log
    const mergeLog = {
      timestamp: new Date().toISOString(),
      summary: {
        totalGroups: exactDuplicates.length,
        successfulMerges: successCount,
        failedMerges: errorCount,
        totalDeleted: results.filter(r => r.success).reduce((sum, r) => sum + r.deleted.length, 0)
      },
      results: results
    };

    const fs = require('fs');
    fs.writeFileSync(
      `merge-log-${new Date().toISOString().split('T')[0]}.json`,
      JSON.stringify(mergeLog, null, 2)
    );

    console.log(`\n📄 Merge log saved to merge-log-${new Date().toISOString().split('T')[0]}.json`);
    console.log('\n✅ Database cleanup complete!');

  } catch (error) {
    console.error('❌ Error during merge execution:', error);
    process.exit(1);
  }
}

// Backup database before major operations
async function createBackup() {
  console.log('💾 Creating database backup...');

  try {
    const { data: components, error } = await supabase
      .from('components')
      .select('*');

    if (error) throw error;

    const fs = require('fs');
    const backupFile = `components-backup-${new Date().toISOString().split('T')[0]}.json`;

    fs.writeFileSync(backupFile, JSON.stringify(components, null, 2));

    console.log(`✅ Backup saved to ${backupFile}`);
    console.log(`📊 Backed up ${components.length} components\n`);

    return backupFile;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const skipBackup = args.includes('--skip-backup');

  if (execute && !skipBackup) {
    await createBackup();
  }

  await executeAllMerges(!execute);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  executeAllMerges,
  executeMerge,
  createBackup
};
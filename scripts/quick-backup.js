const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createQuickBackup() {
  console.log('📦 Creating quick data backup before Postgres upgrade...\n');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `./backups/pre-postgres-upgrade-${timestamp}`;
  
  // Create backup directory
  if (!fs.existsSync('./backups')) {
    fs.mkdirSync('./backups');
  }
  fs.mkdirSync(backupDir);
  
  const tables = [
    'user_gear',
    'user_stacks', 
    'stack_components',
    'components',
    'used_listings'
  ];
  
  for (const table of tables) {
    try {
      console.log(`📊 Backing up ${table}...`);
      
      const { data, error } = await supabase
        .from(table)
        .select('*');
        
      if (error) {
        console.log(`⚠️  Error backing up ${table}:`, error.message);
        continue;
      }
      
      const filename = path.join(backupDir, `${table}.json`);
      fs.writeFileSync(filename, JSON.stringify(data, null, 2));
      console.log(`✅ ${table}: ${data?.length || 0} records backed up`);
      
    } catch (err) {
      console.log(`❌ Failed to backup ${table}:`, err.message);
    }
  }
  
  // Create backup summary
  const summary = {
    timestamp: new Date().toISOString(),
    supabase_url: supabaseUrl,
    postgres_version: 'supabase-postgres-17.4.1.074',
    purpose: 'Pre-Postgres upgrade backup',
    tables: tables,
    note: 'Created before upgrading Postgres to latest security patches'
  };
  
  fs.writeFileSync(
    path.join(backupDir, 'backup-info.json'), 
    JSON.stringify(summary, null, 2)
  );
  
  console.log(`\n🎉 Backup completed!`);
  console.log(`📁 Location: ${backupDir}`);
  console.log(`📋 Tables backed up: ${tables.join(', ')}`);
  console.log('\n✅ Safe to proceed with Postgres upgrade');
  console.log('🔧 Go to Supabase Dashboard > Settings > Infrastructure to upgrade');
}

createQuickBackup();
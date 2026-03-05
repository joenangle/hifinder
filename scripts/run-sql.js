#!/usr/bin/env node
// Usage: npm run db "SELECT count(*) FROM components"
//    or: npm run db -- -f path/to/file.sql

const { execSync } = require('child_process');
const { readFileSync } = require('fs');
const { resolve } = require('path');

const envFile = resolve(__dirname, '..', '.env.local');
const lines = readFileSync(envFile, 'utf8').split('\n');

const get = (key) => {
  const line = lines.find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1) : null;
};

const password = get('SUPABASE_DB_PASSWORD');
const dbUrl = get('DATABASE_URL');

if (!password || !dbUrl) {
  console.error('Missing SUPABASE_DB_PASSWORD or DATABASE_URL in .env.local');
  process.exit(1);
}

const args = process.argv.slice(2);
let psqlArgs;

if (args[0] === '-f') {
  psqlArgs = ['-f', args[1]];
} else {
  psqlArgs = ['-c', args.join(' ')];
}

try {
  execSync(`psql "${dbUrl}" ${psqlArgs.map((a) => `'${a}'`).join(' ')}`, {
    stdio: 'inherit',
    env: { ...process.env, PGPASSWORD: password },
  });
} catch (e) {
  process.exit(e.status || 1);
}

#!/bin/bash
# Quick test: verify psql can reach the Supabase database
set -euo pipefail

ENV_FILE="$(dirname "$0")/../.env.local"

# Extract values safely (handles special chars in passwords)
DB_PASSWORD=$(grep '^SUPABASE_DB_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
DB_URL=$(grep '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2-)

PGPASSWORD="$DB_PASSWORD" psql "$DB_URL" -c "
SELECT
  'components' AS table_name, count(*) FROM components
UNION ALL
SELECT 'curated_systems', count(*) FROM curated_systems
UNION ALL
SELECT 'used_listings', count(*) FROM used_listings
ORDER BY table_name;
"

echo "Connection OK"

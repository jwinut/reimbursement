#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Database Migration Script ==="

# Function to check if a table exists
check_table_exists() {
  local table_name="$1"

  # Try psql first (for CI/CD environments)
  if command -v psql &> /dev/null; then
    result=$(psql "$DATABASE_URL" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table_name');" 2>/dev/null || echo "f")
    echo "$result" | tr -d '[:space:]'
    return
  fi

  # Fallback: use node helper script
  node "$SCRIPT_DIR/check-table.js" "$table_name" 2>/dev/null || echo "f"
}

# Check if _prisma_migrations table exists (indicates migration history)
HAS_MIGRATIONS=$(check_table_exists "_prisma_migrations")

# Check if User table exists (indicates schema exists from db push)
HAS_SCHEMA=$(check_table_exists "User")

echo "Migration history exists: $HAS_MIGRATIONS"
echo "Schema exists: $HAS_SCHEMA"

if [ "$HAS_MIGRATIONS" = "f" ] && [ "$HAS_SCHEMA" = "t" ]; then
  echo ">>> Detected existing schema without migration history (from db push)"
  echo ">>> Baselining existing migrations..."
  npx prisma migrate resolve --applied 20250109000000_init
  npx prisma migrate resolve --applied 20250109000001_auto_approve_existing_users
  echo ">>> Baseline complete"
elif [ "$HAS_MIGRATIONS" = "f" ] && [ "$HAS_SCHEMA" = "f" ]; then
  echo ">>> Fresh database detected - migrations will create schema"
else
  echo ">>> Database already has migration history"
fi

echo ">>> Running prisma migrate deploy..."
npx prisma migrate deploy

echo ">>> Verifying migration status..."
npx prisma migrate status

echo "=== Migration Complete ==="

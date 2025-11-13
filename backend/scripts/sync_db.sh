#!/bin/bash
# Quick script to sync production database to local
# This is a simplified version - use sync_production_db.py for more features

set -e

echo "=================================================="
echo "  Quick Production DB Sync"
echo "=================================================="

# Check if PROD_DATABASE_URL is set
if [ -z "$PROD_DATABASE_URL" ]; then
    echo "❌ Error: PROD_DATABASE_URL not set"
    echo ""
    echo "Set it with:"
    echo "  export PROD_DATABASE_URL='postgresql://user:pass@host:port/dbname'"
    exit 1
fi

# Parse production DB URL
PROD_DB_URL="$PROD_DATABASE_URL"

# Set local DB (default)
LOCAL_DB="${DATABASE_URL:-postgresql://localhost/popmap_dev}"

echo "Production DB: $PROD_DB_URL"
echo "Local DB: $LOCAL_DB"
echo ""

# Confirm
read -p "This will overwrite your local database. Continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy](es)?$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Create backup directory
BACKUP_DIR="$(dirname "$0")/../backups"
mkdir -p "$BACKUP_DIR"

# Create dump file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="$BACKUP_DIR/prod_dump_$TIMESTAMP.sql"

echo ""
echo "📥 Dumping production database..."
pg_dump "$PROD_DB_URL" --no-owner --no-acl -f "$DUMP_FILE"

echo "✅ Dump saved to: $DUMP_FILE"
echo ""
echo "🗑️  Dropping local database..."

# Extract database name from URL
LOCAL_DB_NAME=$(echo "$LOCAL_DB" | sed -E 's|.*/(.*)|\\1|')
LOCAL_DB_HOST=$(echo "$LOCAL_DB" | sed -E 's|.*@([^:/]+).*|\\1|')

# Drop and recreate
psql -h "$LOCAL_DB_HOST" -U postgres -c "DROP DATABASE IF EXISTS $LOCAL_DB_NAME;" postgres 2>/dev/null || true
psql -h "$LOCAL_DB_HOST" -U postgres -c "CREATE DATABASE $LOCAL_DB_NAME;" postgres

echo "📤 Restoring to local database..."
psql "$LOCAL_DB" -f "$DUMP_FILE"

echo ""
echo "✅ Sync complete!"
echo ""
echo "Next steps:"
echo "  python manage.py migrate"
echo "  python manage.py createsuperuser"

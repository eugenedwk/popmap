#!/usr/bin/env python
"""
Script to sync production database to local environment for testing.

Usage:
    python scripts/sync_production_db.py [--sanitize] [--skip-media]

Options:
    --sanitize    Sanitize sensitive data (emails, phone numbers, etc.)
    --skip-media  Don't download media files from S3
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path
from datetime import datetime

# Add parent directory to path to import Django settings
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

def run_command(command, description, check=True):
    """Run a shell command and handle errors."""
    print(f"\n{'='*60}")
    print(f"🔧 {description}")
    print(f"{'='*60}")
    print(f"Running: {command}\n")

    result = subprocess.run(
        command,
        shell=True,
        capture_output=False,
        text=True
    )

    if check and result.returncode != 0:
        print(f"\n❌ Error: {description} failed")
        sys.exit(1)

    return result

def confirm_action(message):
    """Ask user for confirmation."""
    response = input(f"\n⚠️  {message} (yes/no): ").strip().lower()
    return response in ['yes', 'y']

def parse_database_url(url):
    """Parse DATABASE_URL into components."""
    # Format: postgresql://user:password@host:port/dbname
    import re
    pattern = r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)'
    match = re.match(pattern, url)
    if match:
        return {
            'user': match.group(1),
            'password': match.group(2),
            'host': match.group(3),
            'port': match.group(4),
            'dbname': match.group(5)
        }
    return None

def main():
    parser = argparse.ArgumentParser(description='Sync production database to local')
    parser.add_argument('--sanitize', action='store_true',
                       help='Sanitize sensitive data')
    parser.add_argument('--skip-media', action='store_true',
                       help='Skip downloading media files')
    args = parser.parse_args()

    print("""
╔══════════════════════════════════════════════════════════════╗
║        Production Database Sync Script                       ║
║                                                              ║
║  This script will:                                           ║
║  1. Dump production database                                 ║
║  2. Drop local database (if exists)                          ║
║  3. Restore production data to local                         ║
║  4. Optionally sanitize sensitive data                       ║
║  5. Optionally sync media files from S3                      ║
╚══════════════════════════════════════════════════════════════╝
    """)

    # Get production database URL
    prod_db_url = os.getenv('PROD_DATABASE_URL')
    if not prod_db_url:
        print("❌ Error: PROD_DATABASE_URL environment variable not set")
        print("\nPlease set it first:")
        print("  export PROD_DATABASE_URL='postgresql://user:pass@host:port/dbname'")
        sys.exit(1)

    # Get local database URL
    local_db_url = os.getenv('DATABASE_URL', 'postgresql://localhost/popmap_dev')

    # Parse URLs
    prod_db = parse_database_url(prod_db_url)
    local_db = parse_database_url(local_db_url)

    if not prod_db:
        print("❌ Error: Could not parse PROD_DATABASE_URL")
        sys.exit(1)

    print(f"📊 Production DB: {prod_db['host']}:{prod_db['port']}/{prod_db['dbname']}")
    print(f"💻 Local DB: {local_db['host'] if local_db else 'localhost'}/popmap_dev")

    if not confirm_action(
        "This will OVERWRITE your local database. Continue?"
    ):
        print("\n🛑 Cancelled by user")
        sys.exit(0)

    # Create backup directory
    backup_dir = Path(__file__).resolve().parent.parent / 'backups'
    backup_dir.mkdir(exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    dump_file = backup_dir / f'prod_dump_{timestamp}.sql'

    # Step 1: Dump production database
    os.environ['PGPASSWORD'] = prod_db['password']
    dump_cmd = f"""pg_dump \
        -h {prod_db['host']} \
        -p {prod_db['port']} \
        -U {prod_db['user']} \
        -d {prod_db['dbname']} \
        --no-owner \
        --no-acl \
        -f {dump_file}"""

    run_command(dump_cmd, "Dumping production database")
    print(f"✅ Database dumped to: {dump_file}")

    # Step 2: Drop and recreate local database
    if local_db:
        os.environ['PGPASSWORD'] = local_db.get('password', '')
        drop_cmd = f"""psql \
            -h {local_db['host']} \
            -p {local_db['port']} \
            -U {local_db['user']} \
            -c "DROP DATABASE IF EXISTS {local_db['dbname']};" \
            postgres"""

        create_cmd = f"""psql \
            -h {local_db['host']} \
            -p {local_db['port']} \
            -U {local_db['user']} \
            -c "CREATE DATABASE {local_db['dbname']};" \
            postgres"""

        run_command(drop_cmd, "Dropping local database", check=False)
        run_command(create_cmd, "Creating local database")

        # Step 3: Restore to local database
        restore_cmd = f"""psql \
            -h {local_db['host']} \
            -p {local_db['port']} \
            -U {local_db['user']} \
            -d {local_db['dbname']} \
            -f {dump_file}"""

        run_command(restore_cmd, "Restoring to local database")
    else:
        print("⚠️  Using SQLite locally - cannot restore PostgreSQL dump")
        sys.exit(1)

    # Step 4: Sanitize data if requested
    if args.sanitize:
        print("\n🧹 Sanitizing sensitive data...")

        # Run Django management command to sanitize data
        sanitize_script = """
from django.contrib.auth.models import User
from apps.events.models import Business, Event

# Sanitize user emails
for user in User.objects.all():
    user.email = f'test{user.id}@example.com'
    user.save()

# Sanitize business contact info
for business in Business.objects.all():
    business.contact_email = f'business{business.id}@example.com'
    if business.contact_phone:
        business.contact_phone = '+15555555555'
    business.save()

print('✅ Data sanitized!')
"""

        with open(backup_dir / 'sanitize_temp.py', 'w') as f:
            f.write(sanitize_script)

        run_command(
            f"python manage.py shell < {backup_dir / 'sanitize_temp.py'}",
            "Sanitizing sensitive data"
        )

        (backup_dir / 'sanitize_temp.py').unlink()

    # Step 5: Download media files from S3 if requested
    if not args.skip_media:
        s3_bucket = os.getenv('AWS_STORAGE_BUCKET_NAME')
        if s3_bucket and confirm_action("Download media files from S3?"):
            media_dir = Path(__file__).resolve().parent.parent / 'media'
            media_dir.mkdir(exist_ok=True)

            sync_cmd = f"""aws s3 sync \
                s3://{s3_bucket}/ \
                {media_dir}/ \
                --exclude "*" \
                --include "business_logos/*" \
                --include "event_images/*" """

            run_command(sync_cmd, "Syncing media files from S3", check=False)

    print("""

╔══════════════════════════════════════════════════════════════╗
║                    ✅ Sync Complete!                         ║
╚══════════════════════════════════════════════════════════════╝

Next steps:
  1. Run migrations: python manage.py migrate
  2. Create superuser if needed: python manage.py createsuperuser
  3. Start development server: python manage.py runserver

Backup file saved to: {dump_file}
    """)

if __name__ == '__main__':
    main()

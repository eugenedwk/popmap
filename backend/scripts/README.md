# Database Sync Scripts

Scripts to sync production database to local environment for testing and development.

## Prerequisites

1. **PostgreSQL client tools** (`pg_dump`, `psql`)
   ```bash
   # macOS
   brew install postgresql

   # Ubuntu/Debian
   sudo apt-get install postgresql-client
   ```

2. **AWS CLI** (for media file sync)
   ```bash
   # macOS
   brew install awscli

   # Ubuntu/Debian
   sudo apt-get install awscli
   ```

3. **Production database credentials**
   - Get the DATABASE_URL from your production environment
   - Get AWS credentials if syncing media files

## Setup

### 1. Get Production Database URL

From AWS RDS or your production environment:

```bash
# Example format:
export PROD_DATABASE_URL='postgresql://username:password@prod-db-host.region.rds.amazonaws.com:5432/popmap_production'
```

You can find this in:
- AWS RDS Console → Databases → Your DB → Connectivity & security
- Or in your ECS task environment variables

### 2. Set Local Database URL (Optional)

```bash
# If not set, defaults to postgresql://localhost/popmap_dev
export DATABASE_URL='postgresql://localhost/popmap_dev'
```

## Usage

### Quick Sync (Bash Script)

Simple one-command sync:

```bash
cd backend
./scripts/sync_db.sh
```

**What it does:**
- ✅ Dumps production database
- ✅ Drops local database
- ✅ Restores production data locally

### Advanced Sync (Python Script)

For more control and features:

```bash
cd backend

# Basic sync
python scripts/sync_production_db.py

# With data sanitization (recommended for sharing)
python scripts/sync_production_db.py --sanitize

# Without media file download
python scripts/sync_production_db.py --skip-media

# Both options
python scripts/sync_production_db.py --sanitize --skip-media
```

**Features:**
- ✅ Data sanitization (emails, phone numbers)
- ✅ Media file sync from S3
- ✅ Detailed progress output
- ✅ Automatic backup creation
- ✅ Safety confirmations

## Options

### `--sanitize`

Sanitizes sensitive data for safe local development:
- User emails → `test{id}@example.com`
- Business emails → `business{id}@example.com`
- Phone numbers → `+15555555555`

**Use this when:**
- Sharing your local database with team members
- Working on a shared development machine
- Testing features that need production-like data but not real customer info

### `--skip-media`

Skips downloading media files (logos, event images) from S3.

**Use this when:**
- You don't need images for your testing
- You want faster sync times
- You have limited bandwidth

## Security Notes

⚠️ **IMPORTANT:**

1. **Never commit production credentials** to git
   - Use `.env` files (already in `.gitignore`)
   - Or export environment variables temporarily

2. **Sanitize data when sharing**
   - Always use `--sanitize` if sharing your local DB
   - Production data contains real customer information

3. **Keep backups**
   - Dumps are saved to `backend/backups/`
   - Keep these secure and don't commit them

4. **RDS Access**
   - Ensure your IP is whitelisted in the RDS security group
   - Or use an SSH tunnel through a bastion host

## Example Workflow

### First Time Setup

```bash
# 1. Get production credentials
export PROD_DATABASE_URL='postgresql://...'
export AWS_STORAGE_BUCKET_NAME='your-s3-bucket'

# 2. Sync with sanitization
cd backend
python scripts/sync_production_db.py --sanitize

# 3. Run migrations (just in case)
python manage.py migrate

# 4. Create a local superuser
python manage.py createsuperuser

# 5. Start development server
python manage.py runserver
```

### Regular Updates

```bash
# Quick sync without media files
export PROD_DATABASE_URL='postgresql://...'
./scripts/sync_db.sh
python manage.py migrate
python manage.py runserver
```

## Troubleshooting

### "PROD_DATABASE_URL not set"
```bash
export PROD_DATABASE_URL='postgresql://user:pass@host:port/dbname'
```

### "psql: FATAL: database does not exist"
The script should create it automatically, but if not:
```bash
createdb popmap_dev
```

### "Access denied" or connection errors
1. Check RDS security group allows your IP
2. Verify credentials are correct
3. Try connecting directly:
   ```bash
   psql "$PROD_DATABASE_URL" -c "SELECT version();"
   ```

### "pg_dump: command not found"
Install PostgreSQL client tools:
```bash
brew install postgresql  # macOS
```

### S3 sync fails
1. Configure AWS CLI:
   ```bash
   aws configure
   ```
2. Or set environment variables:
   ```bash
   export AWS_ACCESS_KEY_ID='...'
   export AWS_SECRET_ACCESS_KEY='...'
   ```

## Files Created

```
backend/
├── scripts/
│   ├── sync_db.sh              # Quick bash version
│   ├── sync_production_db.py   # Full-featured Python version
│   └── README.md               # This file
└── backups/                    # Created automatically
    └── prod_dump_YYYYMMDD_HHMMSS.sql
```

## Safety Features

Both scripts include:
- ✅ Confirmation prompts before destructive actions
- ✅ Automatic backup creation with timestamps
- ✅ Error handling and validation
- ✅ Clear progress output

## Next Steps After Sync

1. **Verify data**
   ```bash
   python manage.py shell
   >>> from apps.events.models import Business, Event
   >>> Business.objects.count()
   >>> Event.objects.count()
   ```

2. **Check admin panel**
   ```bash
   python manage.py runserver
   # Visit http://localhost:8000/admin
   ```

3. **Test your feature**
   - You now have production-like data locally
   - Test thoroughly before deploying to production

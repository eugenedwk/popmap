#!/bin/bash
set -e

echo "Starting Django application..."

# Wait for database to be ready (optional but recommended)
echo "Waiting for database..."
python << END
import sys
import time
import psycopg2
from django.conf import settings

# Get database settings
db_settings = settings.DATABASES['default']

max_retries = 30
retry_count = 0

while retry_count < max_retries:
    try:
        conn = psycopg2.connect(
            dbname=db_settings['NAME'],
            user=db_settings['USER'],
            password=db_settings['PASSWORD'],
            host=db_settings['HOST'],
            port=db_settings['PORT']
        )
        conn.close()
        print("Database is ready!")
        sys.exit(0)
    except psycopg2.OperationalError:
        retry_count += 1
        print(f"Database not ready yet. Retry {retry_count}/{max_retries}...")
        time.sleep(2)

print("Could not connect to database after maximum retries.")
sys.exit(1)
END

# Run database migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Collect static files (using whitenoise, so this is quick)
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "Starting Gunicorn server..."
# Execute the CMD from Dockerfile (passed as arguments to this script)
exec "$@"

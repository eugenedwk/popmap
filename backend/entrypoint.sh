#!/bin/bash
set -e

echo "Starting Django application..."

# Wait for database to be ready using Django's connection check
echo "Waiting for database..."
max_retries=30
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if python manage.py check --database default > /dev/null 2>&1; then
        echo "Database is ready!"
        break
    else
        retry_count=$((retry_count + 1))
        echo "Database not ready yet. Retry $retry_count/$max_retries..."
        sleep 2
    fi
done

if [ $retry_count -eq $max_retries ]; then
    echo "Could not connect to database after maximum retries."
    exit 1
fi

# Run database migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Collect static files (using whitenoise, so this is quick)
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "Starting Gunicorn server..."
# Execute the CMD from Dockerfile (passed as arguments to this script)
exec "$@"

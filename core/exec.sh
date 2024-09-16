#!/bin/bash

MAX_RETRIES=10
RETRY_COUNT=0
RETRY_INTERVAL=2

echo "Exec.sh is running..."

until python manage.py migrate --noinput; do
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "Database is not ready after $MAX_RETRIES attempts. Exiting."
    exit 1
  fi
  echo "Waiting for database to be ready..."
  sleep $RETRY_INTERVAL
  RETRY_COUNT=$((RETRY_COUNT + 1))
done

python manage.py makemigrations
python manage.py migrate

exec "$@"
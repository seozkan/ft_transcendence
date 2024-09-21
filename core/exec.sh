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
python manage.py shell << EOF
from django.contrib.auth.models import User

username = "${DJANGO_ADMIN_USER}"
email = "${DJANGO_ADMIN_MAIL}"
password = "${DJANGO_ADMIN_PASSWORD}"

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username, email, password)
EOF
python manage.py collectstatic --noinput

exec "$@"
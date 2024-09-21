#!/bin/bash

echo "Exec.sh is running..."

python manage.py makemigrations

until python manage.py migrate --noinput; do
  echo "Waiting for database to be ready..."
  sleep 3
done

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
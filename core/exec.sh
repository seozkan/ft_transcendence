#!/bin/bash

echo "Exec.sh is running..."

python manage.py makemigrations

until python manage.py migrate --noinput; do
  echo "Waiting for database to be ready..."
  sleep 3
done

python manage.py shell << EOF
from accounts.models import CustomUser

username = "${DJANGO_ADMIN_USER}"
email = "${DJANGO_ADMIN_MAIL}"
password = "${DJANGO_ADMIN_PASSWORD}"

if not CustomUser.objects.filter(username=username).exists():
    CustomUser.objects.create_superuser(username, email, password)
EOF

python manage.py collectstatic --noinput

exec "$@"
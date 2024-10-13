from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
import uuid

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self.create_user(email, password, **extra_fields)

class CustomUser(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(("email adresi"), unique=True)
    username = models.CharField(max_length=200, unique=True, blank=True, null=True)
    imageUrl = models.CharField(max_length=200, blank=True, null=True)
    isTfaActive = models.BooleanField(("2FA Etkin"),default=False)
    tfaSecret = models.CharField(("2FA Anahtarı"),max_length=200, blank=True, null=True)
    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = [""]
    
    def __str__(self):
        return self.email
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

def user_avatar_path(instance, filename):
    return f'avatars/{instance.id}/{filename}'

class CustomUser(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(("email adresi"), unique=True)
    username = models.CharField(max_length=200, unique=True, blank=True, null=True)
    avatar = models.ImageField(
        upload_to=user_avatar_path, 
        blank=True, 
        null=True, 
        default='avatars/default_avatar.jpg'
    )
    isTfaActive = models.BooleanField(("2FA Etkin"),default=False)
    tfaSecret = models.CharField(("2FA Anahtarı"),max_length=200, blank=True, null=True)
    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = [""]
    
    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.is_superuser and not hasattr(self, 'player'):
            Player.objects.create(player=self)

    def add_friend(self, friend):
        if not self.is_friend(friend):
            Friendship.objects.create(from_user=self, to_user=friend)
            return True
        return False

    def remove_friend(self, friend):
        Friendship.objects.filter(from_user=self, to_user=friend).delete()

    def is_friend(self, friend):
        return Friendship.objects.filter(from_user=self, to_user=friend).exists()

    def get_friends(self):
        return CustomUser.objects.filter(friends__from_user=self)

    def block_user(self, user):
        if not self.is_blocking(user):
            BlockedUser.objects.create(blocker=self, blocked=user)

    def unblock_user(self, user):
        BlockedUser.objects.filter(blocker=self, blocked=user).delete()

    def is_blocking(self, user):
        return BlockedUser.objects.filter(blocker=self, blocked=user).exists()

    def get_blocked_users(self):
        return CustomUser.objects.filter(blocked_by__blocker=self)
    
class Player(models.Model):
    player = models.OneToOneField(CustomUser, related_name='player', on_delete=models.CASCADE)
    score = models.IntegerField(default = 0)

class Friendship(models.Model):
    from_user = models.ForeignKey(CustomUser, related_name='friendships', on_delete=models.CASCADE)
    to_user = models.ForeignKey(CustomUser, related_name='friends', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('from_user', 'to_user')

    def __str__(self):
        return f"{self.from_user.email} -> {self.to_user.email}"
    

class BlockedUser(models.Model):
    blocker = models.ForeignKey(CustomUser, related_name='blocking', on_delete=models.CASCADE)
    blocked = models.ForeignKey(CustomUser, related_name='blocked_by', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('blocker', 'blocked')

    def __str__(self):
        return f"{self.blocker.email} blocked {self.blocked.email}"
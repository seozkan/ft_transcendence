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

    def send_request(self, friend):
        if not self.is_friend(friend) and not self.has_pending_friend_request(friend):
            FriendRequest.objects.create(from_user=self, to_user=friend)
            Notification.objects.create(user=friend, message=self.username, type='friend')
            return True
        return False

    def has_pending_friend_request(self, friend):
        return FriendRequest.objects.filter(from_user=self, to_user=friend).exists()
    
    def reject_friend_request(self, friend_request):
        if friend_request.to_user == self:
            friend_request.delete()
            return True
        return False

    def is_friend(self, friend):
        if self == friend:
            return False
        return Friendship.objects.filter(
            user1=min(self, friend, key=lambda x: x.id),
            user2=max(self, friend, key=lambda x: x.id)
        ).exists()

    def get_friends(self):
        friendships = Friendship.objects.filter(models.Q(user1=self) | models.Q(user2=self))
        friends = []
        for friendship in friendships:
            friends.append(friendship.user2 if friendship.user1 == self else friendship.user1)
        return friends

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
    user1 = models.ForeignKey(CustomUser, related_name='friendship_initiated', on_delete=models.CASCADE)
    user2 = models.ForeignKey(CustomUser, related_name='friendship_received', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = (('user1', 'user2'), ('user2', 'user1'))

    def __str__(self):
        return f"{self.user1.email} <-> {self.user2.email}"

class FriendRequest(models.Model):
    from_user = models.ForeignKey(CustomUser, related_name='sent_friend_requests', on_delete=models.CASCADE)
    to_user = models.ForeignKey(CustomUser, related_name='received_friend_requests', on_delete=models.CASCADE)
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
    
class Notification(models.Model):
    user = models.ForeignKey(CustomUser, related_name='notifications', on_delete=models.CASCADE)
    message = models.CharField(max_length=1000)
    type = models.CharField(max_length=20, default='normal')
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def delete_notification(self):
        self.delete()

    def __str__(self):
        return f"Notification for {self.user.email}: {self.message}"
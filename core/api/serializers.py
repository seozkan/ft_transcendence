from rest_framework.serializers import ModelSerializer, ImageField, CharField
from django.contrib.auth import get_user_model
from accounts.models import Player

class UserSerializer(ModelSerializer):
    avatar_url = ImageField(source='avatar', read_only=True)

    class Meta:
        model = get_user_model()
        fields = ['username', 'email', 'first_name', 'last_name', 'avatar_url','isTfaActive']

class PlayerSerializer(ModelSerializer):
    username = CharField(source='player.username', read_only=True)

    class Meta:
        model = Player
        fields = ['id', 'score', 'username']
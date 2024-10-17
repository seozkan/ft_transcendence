from rest_framework.serializers import ModelSerializer, ImageField
from django.contrib.auth import get_user_model

class UserSerializer(ModelSerializer):
    avatar_url = ImageField(source='avatar', read_only=True)

    class Meta:
        model = get_user_model()
        fields = ['username', 'email', 'first_name', 'last_name', 'avatar_url','isTfaActive']
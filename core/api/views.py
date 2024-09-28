from rest_framework import viewsets, status
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .serializers import UserSerializer

class UserViewset(viewsets.ViewSet):
    def get_user_info(self, request):
        User = get_user_model()
        try:
            user = User.objects.get(id=request.user.id)
            serializer = UserSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
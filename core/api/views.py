from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from .serializers import UserSerializer

class UserView(APIView):
    def get(self, request):
        User = get_user_model()
        obj = User.objects.all()
        serializer = UserSerializer(obj, many=True)
        return Response(serializer.data)
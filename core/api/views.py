from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from .serializers import UserSerializer

class UserView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        obj = User.objects.all()
        serializer = UserSerializer(obj, many=True)

        return Response(serializer.data)
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Room, User

class ChatViewset(viewsets.ViewSet):
    def get_room(self, request):
        try:
            second_user = User.objects.get(username=request.data.get('second_user'))
            room = Room.objects.get(
                Q(first_user=request.user, second_user=second_user) |
                Q(first_user=second_user, second_user=request.user)
            )
            return Response({"room_id": room.id}, status=status.HTTP_200_OK)
        except Room.DoesNotExist:
            room = Room.objects.create(first_user=request.user, second_user=second_user)
            return Response({"room_id": room.id}, status=status.HTTP_201_CREATED)
        except User.DoesNotExist:
            return Response({"error": "Second user not found"}, status=status.HTTP_404_NOT_FOUND)
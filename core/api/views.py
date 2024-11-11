from rest_framework import viewsets, status
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, PlayerSerializer
from accounts.models import Player, FriendRequest , Friendship, Notification
import pyotp
import qrcode
from io import BytesIO
import base64
from django.db import models

class UserViewset(viewsets.ViewSet):
    def get_user_info(self, request, *args, **kwargs):
        username = kwargs.get('username')
        if (username == 'null'):
            username = request.user.username
        try:
            User = get_user_model()
            user = User.objects.get(username=username)
            serializer = UserSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'user not found.'}, status=status.HTTP_404_NOT_FOUND)
        
    def get_username(self, request):
        try:
            User = get_user_model()
            user = User.objects.get(id = request.user.id)
            serializer = UserSerializer(user)
            return Response({'username' : serializer.data['username']}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'user not found.'}, status=status.HTTP_404_NOT_FOUND)
        
    # 2FA Funcs
    def generate_tfa(self, request):
        try:
            User = get_user_model()
            user = User.objects.get(id=request.user.id)
            secret = pyotp.random_base32()
            user.tfaSecret = secret
            user.save()
            totp = pyotp.TOTP(secret)
            auth_url = totp.provisioning_uri(name=request.user.email, issuer_name="Ping Pong")
            
            qr = qrcode.make(auth_url)
            
            buffer = BytesIO()
            qr.save(buffer, format="PNG")
            buffer.seek(0)
            
            img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            return Response({'qrCode': img_str}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    def verify_tfa(self, request):
        try:
            User = get_user_model()
            user = User.objects.get(id=request.user.id)
            totp = pyotp.TOTP(user.tfaSecret)
            tfa_code = request.data.get('tfaCode')
            if totp.verify(tfa_code):
                if not user.isTfaActive:
                    user.isTfaActive = True
                    user.save()
                return Response({'success': 'TOPT code valid'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'invalid TOTP code'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'user not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    #Personalize Funcs

    def update_ui(self, request):
        try:
            User = get_user_model()
            user = User.objects.get(id=request.user.id)
            avatar = request.data.get('avatar')
            username = request.data.get('username')
            
            if not (username.isalnum() and len(username) > 3):
                return Response({'error': 'username must be alphanumeric and username length must be greater than three'}, status=status.HTTP_400_BAD_REQUEST)
            
            if User.objects.filter(username=username).exclude(id=user.id).exists():
                return Response({'error': 'username already exists'}, status=status.HTTP_409_CONFLICT)
            
            user.username = username
            if avatar != 'undefined':
                if user.avatar and user.avatar.name != 'avatars/default_avatar.jpg':
                    user.avatar.delete(save=False)
                user.avatar.save(avatar.name, avatar)
            user.save()
            return Response({'success': 'username and avatar updated successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    def send_friend_request(self, request):
        friend_username = request.data.get('username')
        User = get_user_model()
        try:
            user = User.objects.get(id = request.user.id)
            friend = User.objects.get(username = friend_username)
            if (user == friend):
                return Response({'error': 'you cannot add yourself as a friend'}, status=status.HTTP_400_BAD_REQUEST)
            if (user.has_pending_friend_request(friend)):
                return Response({'error': 'friend request already sent'}, status=status.HTTP_409_CONFLICT)
            else:
                user.send_request(friend)
            return Response({'success': 'friend added successfully'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'user not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def is_friend(self, request):
        friend_username = request.data.get('username')
        User = get_user_model()
        try:
            user = User.objects.get(id = request.user.id)
            friend = User.objects.get(username = friend_username)
            isFriend = user.is_friend(friend)
            isReq = user.has_pending_friend_request(friend)
            return Response({'isFriend' : isFriend, 'isReq' : isReq})
        except User.DoesNotExist:
            return Response({'error': 'user not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def accept_friend_request(self, request):
        friend_username = request.data.get('username')
        User = get_user_model()
        try:
            user = User.objects.get(id=request.user.id)
            friend = User.objects.get(username=friend_username)
            friend_request = FriendRequest.objects.get(from_user=friend, to_user=user)
            
            if friend_request.to_user == user:
                Friendship.objects.get_or_create(
                    user1=min(user, friend_request.from_user, key=lambda x: x.id),
                    user2=max(user, friend_request.from_user, key=lambda x: x.id)
                )

                friend_request.delete()

                Notification.objects.filter(
                    user=user, message=friend_request.from_user.username, type='friend'
                ).delete()

                return Response({'success': 'friend request approved'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'friend request not found'}, status=status.HTTP_404_NOT_FOUND)
        except FriendRequest.DoesNotExist:
            return Response({'error': 'friend request not found'}, status=status.HTTP_404_NOT_FOUND)
        except User.DoesNotExist:
            return Response({'error': 'user not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def reject_friend_request(self, request):
        friend_username = request.data.get('username')
        User = get_user_model()
        try:
            user = User.objects.get(id=request.user.id)
            friend = User.objects.get(username=friend_username)
            friend_request = FriendRequest.objects.get(from_user=friend, to_user=user)
            
            if friend_request.to_user == user:
                friend_request.delete()

                Notification.objects.filter(
                    user=user, message=friend_request.from_user.username, type='friend'
                ).delete()

                return Response({'success': 'friend request rejected'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'friend request not found'}, status=status.HTTP_404_NOT_FOUND)
        except FriendRequest.DoesNotExist:
            return Response({'error': 'friend request not found'}, status=status.HTTP_404_NOT_FOUND)
        except User.DoesNotExist:
            return Response({'error': 'user not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def remove_friend(self, request):
        friend_username = request.data.get('username')
        User = get_user_model()
        try:
            user = User.objects.get(id=request.user.id)
            friend = User.objects.get(username=friend_username)
            friendship = Friendship.objects.filter(
                user1=min(user, friend, key=lambda x: x.id),
                user2=max(user, friend, key=lambda x: x.id)
            )
            if friendship.exists():
                friendship.delete()
                return Response({'success': 'friend removed successfully'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'friendship not found'}, status=status.HTTP_404_NOT_FOUND)
        except User.DoesNotExist:
            return Response({'error': 'user not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_friends(self, request):
        try:
            User = get_user_model()
            user = User.objects.get(id=request.user.id)
            friendships = Friendship.objects.filter(models.Q(user1=user) | models.Q(user2=user))
            friends = []
            for friendship in friendships:
                friends.append(friendship.user2 if friendship.user1 == user else friendship.user1)
            serializer = UserSerializer(friends, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'user not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PlayerViewSet(viewsets.ViewSet):
    def get_all_player(self, request):
        queryset = Player.objects.all().order_by('-score')
        serializer = PlayerSerializer(queryset, many=True)
        return Response(serializer.data)
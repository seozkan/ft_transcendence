from rest_framework import viewsets, status
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .serializers import UserSerializer
import pyotp
import qrcode
from io import BytesIO
import base64

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
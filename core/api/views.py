from rest_framework import viewsets, status
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .serializers import UserSerializer
import pyotp
import qrcode
from io import BytesIO
import base64

class UserViewset(viewsets.ViewSet):
    def get_user_info(self, request):
        try:
            User = get_user_model()
            user = User.objects.get(id=request.user.id)
            serializer = UserSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'user not found.'}, status=status.HTTP_404_NOT_FOUND)
        
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
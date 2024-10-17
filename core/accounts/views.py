from django.contrib.auth import get_user_model
from django.conf import settings
from django.shortcuts import redirect
from django.contrib.auth import login, logout
from rest_framework.response import Response
from rest_framework import viewsets, status
from datetime import datetime, timezone, timedelta
import requests
import jwt
import uuid
import pyotp

class AuthViewset(viewsets.ViewSet):
    def create_access_token(self, user_id):
        payload = {
            'user_id': str(user_id),
            'jti': str(uuid.uuid4()),
            'exp': datetime.now(tz=timezone.utc) + timedelta(minutes=60),
            'iat': datetime.now(tz=timezone.utc)
        }
        access_token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        return access_token

    def create_refresh_token(self, user_id):
        payload = {
            'user_id': str(user_id),
            'jti': str(uuid.uuid4()),
            'exp': datetime.now(tz=timezone.utc) + timedelta(days=7),
            'iat': datetime.now(tz=timezone.utc)
        }
        refresh_token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        return refresh_token
    
    def get_intra_access_token(self, request):
        code = request.query_params['code']
        intra_auth_url = "https://api.intra.42.fr/oauth/token"
        data = {
                "grant_type": "authorization_code",
                "client_id": settings.INTRA_UID,
                "client_secret": settings.INTRA_SECRET,
                "code": code,
                "redirect_uri": "https://localhost/accounts/intra"
            }
        response = requests.post(intra_auth_url, data=data)
        if response.status_code != 200:
            return Response({'Error': 'Intra Auth Error'}, status=response.status_code)
        intra_access_token = response.json().get("access_token")
        return intra_access_token
    
    def get_intra_user_info(self, request):
        intra_access_token = self.get_intra_access_token(request)
        user_info_url = "https://api.intra.42.fr/v2/me"
        headers = {'Authorization': f"Bearer {intra_access_token}"}
        response = requests.get(user_info_url, headers=headers)

        return response.json()
    
    def user_logout(self, request):
        if request.user.is_authenticated:
            try:
                logout(request)
                return Response("success", status=status.HTTP_200_OK)
            except Exception:
                return Response("error", status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response("No user is logged in", status=status.HTTP_400_BAD_REQUEST)

    def intra_login(self, request):
        info_json = self.get_intra_user_info(request)
        User = get_user_model()
        email = info_json.get("email")

        try:
            user = User.objects.get(email=email)
            if (user.isTfaActive):
                response = redirect(f'https://localhost/tfa')
                response.set_cookie('uuid', user.id)
                return response
            elif not (user.username):
                response = redirect(f'https://localhost/personalize')
                response.set_cookie('uuid', user.id)
                return response
        except User.DoesNotExist:
            user = User.objects.create_user(
                email=email,
                first_name=info_json.get("first_name"),
                last_name=info_json.get("last_name"),
            )

        login(request, user)

        access_token = self.create_access_token(user.id)
        refresh_token = self.create_refresh_token(user.id)
        
        if user.username:
            response = redirect('https://localhost/profile')
        else:
            response = redirect('https://localhost/personalize')
        response.set_cookie('access_token', access_token)
        response.set_cookie('refresh_token', refresh_token)
        return response
    
    def tfa_login(self, request):
        try:
            User = get_user_model()
            user = User.objects.get(id=request.COOKIES.get('uuid'))
            totp = pyotp.TOTP(user.tfaSecret)
            tfa_code = request.data.get('tfaCode')
            if totp.verify(tfa_code):
                login(request, user)

                access_token = self.create_access_token(user.id)
                refresh_token = self.create_refresh_token(user.id)

                response = redirect('https://localhost/profile')
                response.set_cookie('access_token', access_token)
                response.set_cookie('refresh_token', refresh_token)
                return response
            else:
                return Response({'error': 'invalid TOTP code'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'user not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
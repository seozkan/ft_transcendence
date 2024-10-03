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
        except User.DoesNotExist:
            user = User.objects.create_user(
                username=info_json.get("login"),
                email=email,
                first_name=info_json.get("first_name"),
                last_name=info_json.get("last_name"),
                image_url=info_json.get('image', {}).get('versions', {}).get('small')
            )

        login(request, user)

        access_token = self.create_access_token(user.id)
        refresh_token = self.create_refresh_token(user.id)

        response = redirect('https://localhost/profile')
        response.set_cookie('access_token', access_token)
        response.set_cookie('refresh_token', refresh_token)
        
        return response
import jwt
from django.conf import settings
from django.http import JsonResponse
from django.contrib.auth import get_user_model

class JWTAuthenticationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/api'):
            authorization = request.headers.get("Authorization")

            if not authorization or not authorization.startswith("Bearer "):
                return JsonResponse({"error": "Unauthorized"}, status=401)

            token = authorization.split(" ")[1]

            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                User = get_user_model()
                user = User.objects.get(id=payload['user_id'])
                request.user = user
            except User.DoesNotExist:
                return JsonResponse({"error": "User does not exitst"}, status=404)
            except jwt.ExpiredSignatureError:
                return JsonResponse({"error": "Token has expired"}, status=401)
            except jwt.InvalidTokenError:
                return JsonResponse({"error": "Invalid token"}, status=401)

        response = self.get_response(request)
        return response
from django.urls import path
from .views import UserViewset

urlpatterns = [
    path('user', UserViewset.as_view({'get': 'get_user_info'}))
]
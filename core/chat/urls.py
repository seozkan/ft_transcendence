from django.urls import path
from .views import ChatViewset

urlpatterns = [
    path('get_room', ChatViewset.as_view({'post': 'get_room'}))
]
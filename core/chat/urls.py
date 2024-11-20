from django.urls import path
from .views import ChatViewset, NotificationViewSet

urlpatterns = [
    path('get_room', ChatViewset.as_view({'post': 'get_room'})),
    path('save_message', ChatViewset.as_view({'post': 'save_message'})),
    path('get_messages', ChatViewset.as_view({'post': 'get_messages'})),
    path('send_notification', NotificationViewSet.as_view({'post': 'send_notification'}))
]
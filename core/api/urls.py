from django.urls import path
from .views import UserViewset, PlayerViewSet

urlpatterns = [
    path('users/<str:username>', UserViewset.as_view({'get': 'get_user_info'})),
    path('get_username', UserViewset.as_view({'get': 'get_username'})),
    path('generate_tfa', UserViewset.as_view({'get': 'generate_tfa'})),
    path('verify_tfa', UserViewset.as_view({'post': 'verify_tfa'})),
    path('update_ui', UserViewset.as_view({'post': 'update_ui'})),
    path('send_friend_request', UserViewset.as_view({'post': 'send_friend_request'})),
    path('is_friend', UserViewset.as_view({'post': 'is_friend'})),
    path('accept_friend_request', UserViewset.as_view({'post': 'accept_friend_request'})),
    path('reject_friend_request', UserViewset.as_view({'post': 'reject_friend_request'})),
    path('remove_friend', UserViewset.as_view({'post': 'remove_friend'})),
    path('get_friends', UserViewset.as_view({'get': 'get_friends'})),
    path('get_all_player', PlayerViewSet.as_view({'get' : 'get_all_player'}))
]
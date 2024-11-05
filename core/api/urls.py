from django.urls import path
from .views import UserViewset, PlayerViewSet

urlpatterns = [
    path('users/<str:username>', UserViewset.as_view({'get': 'get_user_info'})),
    path('get_username', UserViewset.as_view({'get': 'get_username'})),
    path('generate_tfa', UserViewset.as_view({'get': 'generate_tfa'})),
    path('verify_tfa', UserViewset.as_view({'post': 'verify_tfa'})),
    path('update_ui', UserViewset.as_view({'post': 'update_ui'})),
    path('add_friend', UserViewset.as_view({'post': 'add_friend'})),
    path('is_friend', UserViewset.as_view({'post': 'is_friend'})),
    path('get_all_player', PlayerViewSet.as_view({'get' : 'get_all_player'}))
]
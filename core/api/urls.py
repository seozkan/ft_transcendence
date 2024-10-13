from django.urls import path
from .views import UserViewset

urlpatterns = [
    path('user', UserViewset.as_view({'get': 'get_user_info'})),
    path('generate_tfa', UserViewset.as_view({'get': 'generate_tfa'})),
    path('verify_tfa', UserViewset.as_view({'post': 'verify_tfa'})),
    path('update_ui', UserViewset.as_view({'post': 'update_ui'}))
]
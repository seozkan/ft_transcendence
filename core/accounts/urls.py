from django.urls import path
from .views import AuthViewset

urlpatterns = [
    path('intra', AuthViewset.as_view({'get': 'intra_login'})),
    path('tfa_login', AuthViewset.as_view({'post': 'tfa_login'})),
    path('logout', AuthViewset.as_view({'get': 'user_logout'}))
]
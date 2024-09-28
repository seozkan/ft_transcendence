from django.urls import path
from .views import AuthViewset

urlpatterns = [
    path('intra', AuthViewset.as_view({'get': 'intra_login'}))
]
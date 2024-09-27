from django.urls import path
from rest_framework import viewsets
from .views import AuthViewset

urlpatterns = [
    path('intra', AuthViewset.as_view({'get': 'intra_login'}))
]
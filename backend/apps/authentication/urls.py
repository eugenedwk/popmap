from django.urls import path
from . import views

app_name = 'authentication'

urlpatterns = [
    path('me/', views.me, name='me'),
    path('profile/', views.update_profile, name='update-profile'),
    path('config/', views.auth_config, name='config'),
    path('status/', views.auth_status, name='status'),
]

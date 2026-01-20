from django.urls import path
from . import views

app_name = 'instagram'

urlpatterns = [
    path('import/', views.InstagramImportView.as_view(), name='import'),
    path('import/history/', views.InstagramImportHistoryView.as_view(), name='import-history'),
]

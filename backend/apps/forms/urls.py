from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FormTemplateViewSet, FormFieldViewSet, FormSubmissionViewSet

router = DefaultRouter()
router.register(r'templates', FormTemplateViewSet, basename='form-template')
router.register(r'fields', FormFieldViewSet, basename='form-field')
router.register(r'submissions', FormSubmissionViewSet, basename='form-submission')

urlpatterns = [
    path('', include(router.urls)),
]

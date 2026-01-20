from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.events.models import Business
from apps.instagram.models import InstagramPostLog
from apps.instagram.services.import_service import InstagramImportService
from apps.instagram.serializers import ImportResultSerializer, ImportHistorySerializer


class InstagramImportView(APIView):
    """Trigger Instagram import for the authenticated user's business"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        business = Business.objects.filter(owner=request.user).first()
        if not business:
            return Response(
                {'error': 'No business found for this user'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not business.can_use_premium_customization():
            return Response(
                {'error': 'Premium subscription required for Instagram import'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not business.instagram_handle:
            return Response(
                {'error': 'No Instagram handle configured. Please add your Instagram handle in settings.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        service = InstagramImportService()
        result = service.import_posts(business)

        if result.error:
            return Response(
                {'error': result.error},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ImportResultSerializer(result)
        return Response(serializer.data)


class InstagramImportHistoryView(APIView):
    """View import history for the authenticated user's business"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        business = Business.objects.filter(owner=request.user).first()
        if not business:
            return Response(
                {'error': 'No business found for this user'},
                status=status.HTTP_404_NOT_FOUND
            )

        logs = InstagramPostLog.objects.filter(business=business).select_related('event')[:50]
        serializer = ImportHistorySerializer(logs, many=True)
        return Response(serializer.data)

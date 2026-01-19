from django.http import JsonResponse
from django.db import connection


def health_check(request):
    """
    Health check endpoint for load balancer.
    Returns 200 if the service is healthy, 503 if database is unreachable.
    """
    try:
        # Check database connectivity
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")

        return JsonResponse({
            "status": "healthy",
            "database": "connected"
        })
    except Exception as e:
        return JsonResponse({
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }, status=503)

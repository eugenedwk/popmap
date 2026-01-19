from django.http import HttpResponseBadRequest


class HealthCheckMiddleware:
    """
    Middleware that allows health check requests to bypass ALLOWED_HOSTS validation.
    Must be placed before SecurityMiddleware in MIDDLEWARE list.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Allow health check endpoint regardless of Host header
        if request.path == '/health/':
            # Skip the rest of the middleware chain for health checks
            # and directly import and call the health check view
            from config.health import health_check
            return health_check(request)

        return self.get_response(request)

from django.http import HttpResponse, JsonResponse
from django.shortcuts import redirect
from .models import Business


class SubdomainMiddleware:
    """
    Middleware to handle custom subdomain routing.

    When a request comes to <subdomain>.popmap.co, this middleware:
    1. Extracts the subdomain
    2. Looks up the business with that custom_subdomain
    3. Attaches the business to the request object
    4. For non-API requests on subdomain root, redirects to business profile
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Get the host from the request
        host = request.get_host().split(':')[0]  # Remove port if present

        # Extract subdomain (e.g., "mybusiness" from "mybusiness.popmap.co")
        subdomain = self.get_subdomain(host)

        # Attach subdomain info to request
        request.subdomain = subdomain
        request.business = None

        if subdomain and subdomain not in ['www', 'api', 'admin']:
            # Look up business by subdomain
            try:
                business = Business.objects.get(
                    custom_subdomain=subdomain,
                    is_verified=True  # Only show verified businesses
                )
                request.business = business

                # For root path on subdomain, redirect to business profile
                # This makes mybusiness.popmap.co redirect to mybusiness.popmap.co/p/123
                if request.path in ['/', ''] and not request.path.startswith('/api'):
                    return redirect(f'/p/{business.id}/')

            except Business.DoesNotExist:
                # For non-API requests, return 404 page
                if not request.path.startswith('/api'):
                    return JsonResponse({
                        'error': 'Business not found',
                        'message': f'No business found with subdomain: {subdomain}'
                    }, status=404)

        response = self.get_response(request)
        return response

    def get_subdomain(self, host):
        """
        Extract subdomain from host.

        Examples:
        - mybusiness.popmap.co -> mybusiness
        - www.popmap.co -> www
        - popmap.co -> None
        - localhost -> None
        """
        # List of main domains
        main_domains = ['popmap.co', 'localhost', '127.0.0.1']

        # Check if host is a subdomain
        for domain in main_domains:
            if host.endswith(domain) and host != domain:
                # Extract subdomain
                subdomain = host.replace(f'.{domain}', '')
                return subdomain if subdomain else None

        return None

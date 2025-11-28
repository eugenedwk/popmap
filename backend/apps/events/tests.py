from django.test import TestCase, RequestFactory, override_settings
from django.contrib.auth.models import User
from .middleware import SubdomainMiddleware
from .models import Business, Category


@override_settings(ALLOWED_HOSTS=['*', '.popmap.co', 'testbiz.popmap.co', 'localhost'])
class SubdomainMiddlewareTest(TestCase):
    """Tests for custom subdomain routing middleware"""

    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = SubdomainMiddleware(lambda r: r)

        # Create a test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        # Create a test category
        self.category = Category.objects.create(
            name='Test Category',
            slug='test-category'
        )

        # Create a verified business with custom subdomain
        self.business = Business.objects.create(
            name='Test Business',
            description='A test business',
            contact_email='business@example.com',
            owner=self.user,
            custom_subdomain='testbiz',
            is_verified=True
        )

        # Create an unverified business with subdomain
        self.unverified_business = Business.objects.create(
            name='Unverified Business',
            description='An unverified business',
            contact_email='unverified@example.com',
            owner=self.user,
            custom_subdomain='unverified',
            is_verified=False
        )

    def test_get_subdomain_extracts_correctly(self):
        """Test subdomain extraction from various hosts"""
        test_cases = [
            ('testbiz.popmap.co', 'testbiz'),
            ('mybusiness.popmap.co', 'mybusiness'),
            ('www.popmap.co', 'www'),
            ('popmap.co', None),
            ('localhost', None),
            ('127.0.0.1', None),
            ('api.popmap.co', 'api'),
        ]

        for host, expected in test_cases:
            with self.subTest(host=host):
                result = self.middleware.get_subdomain(host)
                self.assertEqual(result, expected, f"Host {host} should return {expected}")

    def test_subdomain_redirect_to_business_profile(self):
        """Test that subdomain root redirects to business profile page"""
        request = self.factory.get('/')
        request.META['HTTP_HOST'] = 'testbiz.popmap.co'

        response = self.middleware(request)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, f'/p/{self.business.id}/')

    def test_subdomain_attaches_business_to_request(self):
        """Test that business is attached to request object"""
        request = self.factory.get('/some/path/')
        request.META['HTTP_HOST'] = 'testbiz.popmap.co'

        # Use a simple get_response that returns the request
        def get_response(r):
            return r

        middleware = SubdomainMiddleware(get_response)
        result = middleware(request)

        self.assertEqual(result.business, self.business)
        self.assertEqual(result.subdomain, 'testbiz')

    def test_nonexistent_subdomain_returns_404(self):
        """Test that non-existent subdomain returns 404 JSON response"""
        import json
        request = self.factory.get('/')
        request.META['HTTP_HOST'] = 'nonexistent.popmap.co'

        response = self.middleware(request)

        self.assertEqual(response.status_code, 404)
        data = json.loads(response.content)
        self.assertIn('error', data)

    def test_unverified_business_subdomain_returns_404(self):
        """Test that unverified business subdomain returns 404"""
        request = self.factory.get('/')
        request.META['HTTP_HOST'] = 'unverified.popmap.co'

        response = self.middleware(request)

        self.assertEqual(response.status_code, 404)

    def test_main_domain_no_redirect(self):
        """Test that main domain passes through without redirect"""
        request = self.factory.get('/')
        request.META['HTTP_HOST'] = 'popmap.co'

        def get_response(r):
            return r

        middleware = SubdomainMiddleware(get_response)
        result = middleware(request)

        self.assertIsNone(result.subdomain)
        self.assertIsNone(result.business)

    def test_www_subdomain_no_business_lookup(self):
        """Test that www subdomain doesn't trigger business lookup"""
        request = self.factory.get('/')
        request.META['HTTP_HOST'] = 'www.popmap.co'

        def get_response(r):
            return r

        middleware = SubdomainMiddleware(get_response)
        result = middleware(request)

        self.assertEqual(result.subdomain, 'www')
        self.assertIsNone(result.business)

    def test_api_subdomain_no_business_lookup(self):
        """Test that api subdomain doesn't trigger business lookup"""
        request = self.factory.get('/api/events/')
        request.META['HTTP_HOST'] = 'api.popmap.co'

        def get_response(r):
            return r

        middleware = SubdomainMiddleware(get_response)
        result = middleware(request)

        self.assertEqual(result.subdomain, 'api')
        self.assertIsNone(result.business)

    def test_subdomain_with_port_strips_port(self):
        """Test that port is stripped from host"""
        request = self.factory.get('/')
        request.META['HTTP_HOST'] = 'testbiz.popmap.co:8000'

        response = self.middleware(request)

        # Should still redirect correctly
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, f'/p/{self.business.id}/')

    def test_api_path_on_subdomain_no_redirect(self):
        """Test that API paths on subdomain don't redirect"""
        request = self.factory.get('/api/events/')
        request.META['HTTP_HOST'] = 'testbiz.popmap.co'

        def get_response(r):
            return r

        middleware = SubdomainMiddleware(get_response)
        result = middleware(request)

        # Should pass through, not redirect
        self.assertEqual(result.business, self.business)


class BusinessSubdomainModelTest(TestCase):
    """Tests for Business model subdomain methods"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_get_subdomain_url_with_subdomain(self):
        """Test subdomain URL generation"""
        business = Business.objects.create(
            name='Test Business',
            description='Test',
            contact_email='test@example.com',
            owner=self.user,
            custom_subdomain='mybiz',
            is_verified=True
        )

        self.assertEqual(business.get_subdomain_url(), 'https://mybiz.popmap.co')

    def test_get_subdomain_url_without_subdomain(self):
        """Test subdomain URL returns None when no subdomain set"""
        business = Business.objects.create(
            name='Test Business',
            description='Test',
            contact_email='test@example.com',
            owner=self.user,
            is_verified=True
        )

        self.assertIsNone(business.get_subdomain_url())

    def test_can_use_custom_subdomain_without_subscription(self):
        """Test that can_use_custom_subdomain returns False without subscription"""
        business = Business.objects.create(
            name='Test Business',
            description='Test',
            contact_email='test@example.com',
            owner=self.user,
            is_verified=True
        )

        # Without billing subscription, should return False
        self.assertFalse(business.can_use_custom_subdomain())

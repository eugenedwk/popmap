from django.test import TestCase
from apps.events.models import Business


class BusinessInstagramHandleTests(TestCase):
    def test_instagram_handle_field_exists(self):
        """Business model should have instagram_handle field"""
        business = Business.objects.create(name="Test Business")
        self.assertIsNone(business.instagram_handle)

    def test_instagram_handle_saves_correctly(self):
        """Instagram handle should save without @ symbol"""
        business = Business.objects.create(
            name="Test Business",
            instagram_handle="testbusiness"
        )
        self.assertEqual(business.instagram_handle, "testbusiness")

    def test_instagram_handle_max_length(self):
        """Instagram handle should accept up to 30 characters"""
        business = Business.objects.create(
            name="Test Business",
            instagram_handle="a" * 30
        )
        self.assertEqual(len(business.instagram_handle), 30)

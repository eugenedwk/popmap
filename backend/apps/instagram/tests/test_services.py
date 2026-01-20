from django.test import TestCase
from unittest.mock import patch, MagicMock
from apps.instagram.services.base import InstagramPost, InstagramServiceError
from apps.instagram.services.scraper import ScraperInstagramService


class ScraperInstagramServiceTests(TestCase):
    def setUp(self):
        self.service = ScraperInstagramService(api_key="test_key")

    def test_service_instantiates(self):
        """Service should instantiate with API key"""
        self.assertIsNotNone(self.service)

    @patch('apps.instagram.services.scraper.requests.get')
    def test_fetch_posts_returns_instagram_posts(self, mock_get):
        """Should return list of InstagramPost objects"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'data': [{
                'id': '123456',
                'caption': 'Test event #popmap',
                'display_url': 'https://example.com/image.jpg',
                'taken_at_timestamp': 1705600000,
                'shortcode': 'ABC123'
            }]
        }
        mock_get.return_value = mock_response

        posts = self.service.fetch_user_posts_by_hashtag(
            username='testuser',
            hashtag='popmap',
            limit=10
        )

        self.assertEqual(len(posts), 1)
        self.assertIsInstance(posts[0], InstagramPost)
        self.assertEqual(posts[0].post_id, '123456')

    @patch('apps.instagram.services.scraper.requests.get')
    def test_filters_posts_by_hashtag(self, mock_get):
        """Should only return posts containing the hashtag"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'data': [
                {'id': '1', 'caption': 'Has #popmap tag', 'display_url': 'url1', 'taken_at_timestamp': 1705600000, 'shortcode': 'A'},
                {'id': '2', 'caption': 'No tag here', 'display_url': 'url2', 'taken_at_timestamp': 1705600000, 'shortcode': 'B'},
                {'id': '3', 'caption': 'Also #popmap', 'display_url': 'url3', 'taken_at_timestamp': 1705600000, 'shortcode': 'C'},
            ]
        }
        mock_get.return_value = mock_response

        posts = self.service.fetch_user_posts_by_hashtag('testuser', 'popmap')

        self.assertEqual(len(posts), 2)
        self.assertEqual(posts[0].post_id, '1')
        self.assertEqual(posts[1].post_id, '3')

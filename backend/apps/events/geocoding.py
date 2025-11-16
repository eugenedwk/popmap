"""
Geocoding service for converting addresses to latitude/longitude coordinates.
Uses Google Maps Geocoding API.
"""
import logging
from typing import Optional, Tuple
from django.conf import settings
import googlemaps

logger = logging.getLogger(__name__)


class GeocodingService:
    """Service for geocoding addresses using Google Maps API"""

    def __init__(self):
        """Initialize the geocoding client"""
        self.api_key = getattr(settings, 'GOOGLE_MAPS_API_KEY', None)
        self.client = None

        if self.api_key:
            try:
                self.client = googlemaps.Client(key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Google Maps client: {e}")

    def geocode_address(self, address: str) -> Optional[Tuple[float, float]]:
        """
        Convert an address to latitude/longitude coordinates.

        Args:
            address: The address string to geocode

        Returns:
            Tuple of (latitude, longitude) if successful, None otherwise
        """
        if not self.client:
            logger.warning("Google Maps API key not configured, skipping geocoding")
            return None

        if not address or not address.strip():
            logger.warning("Empty address provided for geocoding")
            return None

        try:
            # Geocode the address
            result = self.client.geocode(address)

            if not result or len(result) == 0:
                logger.warning(f"No geocoding results found for address: {address}")
                return None

            # Get the first result's location
            location = result[0]['geometry']['location']
            latitude = location['lat']
            longitude = location['lng']

            logger.info(f"Successfully geocoded address: {address} -> ({latitude}, {longitude})")
            return (latitude, longitude)

        except Exception as e:
            logger.error(f"Error geocoding address '{address}': {e}")
            return None


# Singleton instance
_geocoding_service = None


def get_geocoding_service() -> GeocodingService:
    """Get or create the geocoding service singleton"""
    global _geocoding_service
    if _geocoding_service is None:
        _geocoding_service = GeocodingService()
    return _geocoding_service

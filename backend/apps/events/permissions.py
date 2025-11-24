from rest_framework import permissions


class IsBusinessOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow business owners to edit their businesses.
    - Read permissions (GET, HEAD, OPTIONS) are allowed for any request
    - Write permissions (POST, PUT, PATCH, DELETE) are only allowed to the business owner
    """

    def has_permission(self, request, view):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions require authentication
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the business owner
        return obj.owner == request.user


class IsEventCreatorOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow event creators to edit their events.
    - Read permissions (GET, HEAD, OPTIONS) are allowed for any request
    - Write permissions (POST, PUT, PATCH, DELETE) are only allowed to:
      1. The user who created the event
      2. Business owners whose business is associated with the event
    """

    def has_permission(self, request, view):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions require authentication
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Event creator can edit
        if obj.created_by == request.user:
            return True

        # Business owners associated with the event can edit
        # Check if user owns any of the businesses in the event
        user_businesses = obj.businesses.filter(owner=request.user)
        if user_businesses.exists():
            return True

        return False


class CanCreateEvent(permissions.BasePermission):
    """
    Permission to check if a user can create events.
    Only authenticated business owners can create events.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Check if user has a business owner profile
        if hasattr(request.user, 'profile'):
            return request.user.profile.is_business_owner

        return False

from rest_framework import permissions


class IsBusinessOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow business owners to edit their forms.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Get the business owner
        if hasattr(obj, 'business'):
            # FormTemplate object
            return obj.business.owner == request.user
        elif hasattr(obj, 'form_template'):
            # FormField object
            return obj.form_template.business.owner == request.user

        return False

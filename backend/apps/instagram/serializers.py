from rest_framework import serializers


class ImportResultSerializer(serializers.Serializer):
    imported = serializers.IntegerField()
    skipped_duplicate = serializers.IntegerField()
    skipped_not_event = serializers.IntegerField()
    skipped_error = serializers.IntegerField()
    draft_ids = serializers.ListField(child=serializers.IntegerField())
    error = serializers.CharField(allow_null=True, required=False)


class ImportHistorySerializer(serializers.Serializer):
    instagram_post_id = serializers.CharField()
    event_id = serializers.IntegerField(source='event.id', allow_null=True)
    event_title = serializers.CharField(source='event.title', allow_null=True)
    original_permalink = serializers.URLField()
    imported_at = serializers.DateTimeField()

from rest_framework import serializers

from .models import Shortlist, Venue


class VenueSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Venue
        fields = [
            "id",
            "name",
            "city",
            "capacity",
            "price_per_day",
            "description",
            "amenities",
            "image_url",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_image_url(self, obj):
        if not obj.image_url:
            return f"https://picsum.photos/seed/{obj.pk}/800/600"
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.image_url)
        return obj.image_url


class ShortlistEntrySerializer(serializers.ModelSerializer):
    """Returns the full venue object plus the shortlist timestamp."""

    venue = VenueSerializer(read_only=True)

    class Meta:
        model = Shortlist
        fields = ["id", "venue", "created_at"]
        read_only_fields = ["id", "created_at"]


class AISearchQuerySerializer(serializers.Serializer):
    query = serializers.CharField(
        min_length=3,
        max_length=500,
        help_text="Natural-language description of the event / venue requirements.",
    )


class AISearchJobSerializer(serializers.Serializer):
    job_id = serializers.CharField(read_only=True)


class AISearchResultItemSerializer(serializers.Serializer):
    venue = VenueSerializer(read_only=True)
    explanation = serializers.CharField(read_only=True)


class AISearchResultSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["pending", "complete", "failed"])
    results = AISearchResultItemSerializer(many=True, required=False)
    error = serializers.CharField(required=False)

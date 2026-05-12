from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer
from rest_framework import serializers
from rest_framework.authtoken.views import ObtainAuthToken


@extend_schema(
    auth=[],
    summary="Obtain auth token",
    request=inline_serializer(
        name="TokenRequest",
        fields={
            "username": serializers.CharField(),
            "password": serializers.CharField(),
        },
    ),
    responses={200: inline_serializer(
        name="TokenResponse",
        fields={"token": serializers.CharField()},
    )},
)
class TokenView(ObtainAuthToken):
    pass

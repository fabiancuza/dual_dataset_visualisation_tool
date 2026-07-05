from rest_framework import serializers
from ..models import Municipality, Province


class ProvinceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Province
        fields = [
            "code",
            "name"
        ]


class MunicipalitySerializer(serializers.ModelSerializer):
    province = ProvinceSerializer()

    class Meta:
        model = Municipality
        fields = [
            "code",
            "name",
            "province"
        ]

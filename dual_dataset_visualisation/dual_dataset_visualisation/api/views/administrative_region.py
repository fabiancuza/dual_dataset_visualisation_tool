from rest_framework import viewsets, mixins
from ..models import Municipality, Province
from ..serializers.administrative_region import MunicipalitySerializer, ProvinceSerializer


class MunicipalityViewSet(viewsets.GenericViewSet, mixins.ListModelMixin):
    queryset = Municipality.objects.all()
    serializer_class = MunicipalitySerializer


class ProvinceViewSet(viewsets.GenericViewSet, mixins.ListModelMixin):
    queryset = Province.objects.all()
    serializer_class = ProvinceSerializer

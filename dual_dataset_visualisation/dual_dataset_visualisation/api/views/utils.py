from rest_framework import viewsets, status
from rest_framework.response import Response

from ..utils.aggregate_functions import AggregateFunctions


class AggregateFunctionsViewSet(viewsets.ViewSet):
    def list(self, request):
        return Response(list(AggregateFunctions), status=status.HTTP_200_OK)

from django.db.models import Count, Q
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework.decorators import action

from dual_dataset_visualisation.api.models.dataset import Dataset
from dual_dataset_visualisation.api.serializers.dataset import DatasetSerializer
from rest_framework import viewsets, status
from rest_framework.response import Response
from dual_dataset_visualisation.api.serializers.dataset import DatasetFullSerializer, DatasetVisualisationSerializer
from dual_dataset_visualisation.api.serializers.file_validator import FileValidatorSerializer
from ..models.dataset_row import DatasetRowType
from ..utils.aggregate_functions import AggregateFunctions
from ..utils.aggregator import Aggregator
from dual_dataset_visualisation.api.utils.difference_calculator import DifferenceCalculator


class DatasetViewSet(viewsets.ModelViewSet):
    queryset = Dataset.objects.all()
    serializer_class = DatasetFullSerializer

    def get_serializer_class(self):
        if self.action == 'list':
            return DatasetSerializer
        if self.action == 'visualize':
            return DatasetVisualisationSerializer
        if self.action == 'validate_files':
            return FileValidatorSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        if self.action == 'retrieve':
            return Dataset.objects.annotate(
                original_rows_count=Count(
                    "rows",
                    filter=Q(rows__type=DatasetRowType.ORIGINAL),
                ),
                synthetic_rows_count=Count(
                    "rows",
                    filter=Q(rows__type=DatasetRowType.SYNTHETIC),
                ),
                flagged_rows_count=Count(
                    "rows",
                    filter=Q(rows__flagged=True),
                ),
            )
        return super().get_queryset()

    # add decorators for swagger serializer
    @swagger_auto_schema(
        method='get',
        responses={200: {}},
        query_serializer=DatasetVisualisationSerializer,
    )
    @action(detail=True, methods=['get'])
    def visualize(self, request, pk=None):
        # validate query parameters with serializer
        serializer = self.get_serializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        serializer.validate_with_dataset(self.get_object())

        # Aggregator has no MEAN_DIFFERENCE/VAR_DIFFERENCE case, it only knows how to
        # aggregate one dataset side at a time. So we map to AVG/VAR, run the
        # Aggregator twice below (once per side), and use the two results into a
        # difference via DifferenceCalculator later.
        aggregate_function = serializer.validated_data['aggregate_function']
        if aggregate_function in [AggregateFunctions.MEAN_DIFFERENCE]:
            aggregate_function = AggregateFunctions.AVG
        if aggregate_function in [AggregateFunctions.VAR_DIFFERENCE]:
            aggregate_function = AggregateFunctions.VAR

        aggregator = Aggregator(
            dataset=self.get_object(),
            field_name=serializer.validated_data['field_name'],
            visualisation_level=serializer.validated_data['visualisation_level'],
            aggregate_function=aggregate_function,
        )
        original_aggregated = aggregator.get_aggregated_data(DatasetRowType.ORIGINAL)
        synthetic_aggregated = aggregator.get_aggregated_data(DatasetRowType.SYNTHETIC)

        data = {
            "original": original_aggregated,
            "synthetic": synthetic_aggregated,
        }

        if serializer.validated_data.get('aggregate_function') in [AggregateFunctions.MEAN_DIFFERENCE, AggregateFunctions.VAR_DIFFERENCE]:
            difference_calculator = DifferenceCalculator(
                original_aggregated=original_aggregated,
                synthetic_aggregated=synthetic_aggregated,
                aggregate_function=serializer.validated_data['aggregate_function'],
            )
            differences = difference_calculator.calculate_difference()
            data["difference"] = differences

        return Response(data, status=200)

    @swagger_auto_schema(
        method='post',
        manual_parameters=[
            openapi.Parameter(
                name="original_file",
                in_=openapi.IN_FORM,
                type=openapi.TYPE_FILE,
                required=True,
                description="Original CSV file",
            ),
            openapi.Parameter(
                name="synthetic_file",
                in_=openapi.IN_FORM,
                type=openapi.TYPE_FILE,
                required=True,
                description="Synthetic CSV file",
            ),
        ],
        consumes=["multipart/form-data"],
    )
    @action(detail=False, methods=["post"], url_path="validate-files")
    def validate_files(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        original_file = serializer.validated_data["original_file"]

        # Use the helper on the serializer to read header columns
        original_cols = serializer.read_header_columns(original_file, "original_file")

        return Response(
            {
                "columns": original_cols,
            },
            status=status.HTTP_200_OK,
        )

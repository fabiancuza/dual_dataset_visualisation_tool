from rest_framework import serializers
from ..models.dataset import Dataset
from ..models.dataset_row import DatasetRowType
from ..utils.aggregate_functions import AggregateFunctions
from ..utils.visualisation_level import VisualisationLevel


class DatasetSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = Dataset
        fields = [
            "id",
            "name",
            "postcode_field",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]


class DatasetFullSerializer(DatasetSerializer):
    original_file_preview = serializers.SerializerMethodField()
    synthetic_file_preview = serializers.SerializerMethodField()
    columns = serializers.SerializerMethodField()
    original_rows_count = serializers.IntegerField(read_only=True)
    synthetic_rows_count = serializers.IntegerField(read_only=True)
    flagged_rows_count = serializers.IntegerField(read_only=True)

    class Meta(DatasetSerializer.Meta):
        fields = DatasetSerializer.Meta.fields + [
            "original_file",
            "synthetic_file",
            "original_file_preview",
            "synthetic_file_preview",
            "original_rows_count",
            "synthetic_rows_count",
            "columns",
            "unmatched_rows_count",
            "flagged_rows_count"
        ]

    def get_original_file_preview(self, obj):
        # get 10 rows of the original file as a preview
        original_rows = obj.rows.filter(type=DatasetRowType.ORIGINAL).order_by("created_at")[:10]
        return [row.row_data for row in original_rows]

    def get_synthetic_file_preview(self, obj):
        # get 10 rows of the synthetic file as a preview
        synthetic_rows = obj.rows.filter(type=DatasetRowType.SYNTHETIC).order_by("created_at")[:10]
        return [row.row_data for row in synthetic_rows]

    def get_columns(self, obj):
        # get columns from the first row of the original dataset
        first_row = obj.rows.filter().first()
        if first_row:
            # only get numeric columns
            cols = list(first_row.row_data.keys())
            for col in first_row.row_data.keys():
                try:
                    float(first_row.row_data[col])
                except (ValueError, TypeError):
                    cols.remove(col)
            # remove postcode field
            if obj.postcode_field in cols:
                cols.remove(obj.postcode_field)
            return cols
        return []


class DatasetVisualisationSerializer(serializers.Serializer):
    visualisation_level = serializers.ChoiceField(
        choices=VisualisationLevel.choices()
    )
    aggregate_function = serializers.ChoiceField(
        choices=AggregateFunctions.choices()
    )
    field_name = serializers.CharField(max_length=255)

    def validate_with_dataset(self, dataset: Dataset):
        if (dataset.rows.filter(type=DatasetRowType.ORIGINAL).count() == 0 or
                dataset.rows.filter(type=DatasetRowType.SYNTHETIC).count() == 0):
            raise serializers.ValidationError("Dataset must contain both original and synthetic rows.")

        field_name = self.validated_data.get("field_name")
        sample_row = dataset.rows.first()
        if field_name not in sample_row.row_data:
            raise serializers.ValidationError(f"Field '{field_name}' does not exist in dataset rows.")

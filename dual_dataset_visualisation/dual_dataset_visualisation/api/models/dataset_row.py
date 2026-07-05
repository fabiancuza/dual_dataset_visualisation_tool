from django.db import models
import uuid


class DatasetRowType(models.TextChoices):
    ORIGINAL = 'original', 'Original'
    SYNTHETIC = 'synthetic', 'Synthetic'


class DatasetRow(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dataset = models.ForeignKey(
        'api.Dataset',
        related_name='rows',
        on_delete=models.CASCADE,
    )
    postcode = models.ForeignKey(
        'api.Postcode',
        related_name='dataset_rows',
        on_delete=models.CASCADE,
    )
    row_data = models.JSONField()
    type = models.CharField(
        max_length=20,
        choices=DatasetRowType.choices,
    )
    flagged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["dataset", "type"]),
        ]

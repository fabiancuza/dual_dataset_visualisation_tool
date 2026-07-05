from django.core.validators import FileExtensionValidator
from django.db import models
import uuid
from celery import current_app


class DatasetStatus(models.TextChoices):
    PROCESSING = 'processing', 'Processing'
    COMPLETED = 'completed', 'Completed'
    FAILED = 'failed', 'Failed'


class Dataset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    postcode_field = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20,
        choices=DatasetStatus.choices,
        default=DatasetStatus.PROCESSING,
    )
    original_file = models.FileField(
        upload_to='datasets/original/',
        validators=[FileExtensionValidator(allowed_extensions=["csv"])]
    )
    synthetic_file = models.FileField(
        upload_to='datasets/synthetic/',
        validators=[FileExtensionValidator(allowed_extensions=["csv"])]
    )
    unmatched_rows_count = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def process(self):
        current_app.send_task(
            "dual_dataset_visualisation.api.tasks.process_dataset",
            args=[str(self.id)],
        )

    def save(self, force_insert=False, force_update=False, using=None, update_fields=None):
        # check if it was newly created
        is_new = self._state.adding
        super().save(
            force_insert=force_insert,
            force_update=force_update,
            using=using,
            update_fields=update_fields,
        )
        if is_new:
            self.process()

import uuid
from django.db import models
from .dataset import Dataset


class PostcodeError(models.Model):
    """
    One row per distinct unresolvable postcode value. Each time that
    value fails to resolve during processing a new PostcodeErrorReport
    links it to the Dataset where it occurred, so the same bad postcode
    across multiple uploads accumulates reports rather than duplicate
    PostcodeError rows.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    value = models.CharField(max_length=4, unique=True)

    @property
    def reports_count(self):
        return self.reports.count()

    @property
    def first_reported_at(self):
        return self.reports.order_by('created_at').first().created_at


class PostcodeErrorReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    postcode = models.ForeignKey(PostcodeError, on_delete=models.CASCADE, related_name="reports")
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name="reports")
    created_at = models.DateTimeField(auto_now_add=True)

    @staticmethod
    def create_report(postcode, dataset):
        try:
            postcode_error = PostcodeError.objects.get(value=postcode)
        except PostcodeError.DoesNotExist:
            postcode_error = PostcodeError.objects.create(
                value=postcode
            )

        PostcodeErrorReport.objects.create(
            postcode=postcode_error,
            dataset=dataset
        )

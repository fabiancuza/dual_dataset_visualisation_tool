from django.db import models
import uuid


class Postcode(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    postcode = models.CharField(max_length=4, unique=True)
    neighborhood = models.ForeignKey(
        "api.Neighborhood",
        on_delete=models.CASCADE,
        related_name="postcodes",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.postcode

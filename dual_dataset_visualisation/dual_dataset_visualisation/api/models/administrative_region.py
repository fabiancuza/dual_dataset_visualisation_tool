from django.db import models
import uuid


# abstract model
class AdministrativeRegion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)

    class Meta:
        abstract = True


class Province(AdministrativeRegion):
    pass


class Municipality(AdministrativeRegion):
    province = models.ForeignKey(Province, on_delete=models.CASCADE, related_name="municipalities")

    class Meta:
        verbose_name_plural = "municipalities"


class District(AdministrativeRegion):
    municipality = models.ForeignKey(Municipality, on_delete=models.CASCADE, related_name="districts")


class Neighborhood(AdministrativeRegion):
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name="neighborhoods")

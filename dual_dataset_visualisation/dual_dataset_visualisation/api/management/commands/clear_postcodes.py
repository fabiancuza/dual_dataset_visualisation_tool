from django.core.management.base import BaseCommand
from dual_dataset_visualisation.api.models import Postcode
import loguru


class Command(BaseCommand):
    help = "Delete all postcodes from the database"

    def handle(self, *args, **options):
        count, _ = Postcode.objects.all().delete()
        loguru.logger.info(f"Deleted {count} postcodes from the database")

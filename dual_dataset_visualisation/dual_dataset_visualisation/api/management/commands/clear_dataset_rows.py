from django.core.management.base import BaseCommand
from dual_dataset_visualisation.api.models import DatasetRow
import loguru


class Command(BaseCommand):
    help = "Delete all dataset rows from the database"

    def handle(self, *args, **options):
        count, _ = DatasetRow.objects.all().delete()
        loguru.logger.info(f"Deleted {count} dataset rows from the database")

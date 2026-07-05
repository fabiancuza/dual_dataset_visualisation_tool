import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "dual_dataset_visualisation.settings")

app = Celery("dual_dataset_visualisation")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

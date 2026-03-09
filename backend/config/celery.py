"""
Celery config for Online Judge project.
"""
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('online_judge')
app.config_from_object('django.conf:settings', namespace='CELERY')

app.conf.beat_schedule = {
    'sync-contest-statuses': {
        'task':     'apps.contests.tasks.sync_contest_statuses',
        'schedule': 60.0,
    },
}

app.conf.timezone = 'Asia/Tashkent'

app.autodiscover_tasks()

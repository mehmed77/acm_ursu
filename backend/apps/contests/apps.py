from django.apps import AppConfig


class ContestsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.contests'
    verbose_name = 'Contests'

    def ready(self):
        import apps.contests.signals  # noqa: F401

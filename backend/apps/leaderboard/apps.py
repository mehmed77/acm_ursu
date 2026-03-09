from django.apps import AppConfig


class LeaderboardConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.leaderboard'
    verbose_name = 'Leaderboard'

    def ready(self):
        from apps.leaderboard.signals import connect_user_signal
        connect_user_signal()
        import apps.leaderboard.signals  # noqa: F401

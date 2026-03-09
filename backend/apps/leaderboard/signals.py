"""
Signals for leaderboard updates.
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.contests.models import Contest
from .services import update_rating_after_contest

logger = logging.getLogger(__name__)


# @receiver(post_save, sender=Contest)
# def handle_contest_end(sender, instance, **kwargs):
#     """
#     Kontest saqlanganida — agar rated va tugagan bo'lsa,
#     ratinglarni yangilash.
#     """
#     if (instance.is_rated
#             and instance.status == 'finished'
#             and instance.is_public):
#         try:
#             update_rating_after_contest(instance)
#         except Exception:
#             logger.exception(f"Rating yangilashda xato: {instance.title}")


def create_user_rating(sender, instance, created, **kwargs):
    """Yangi foydalanuvchi uchun UserRating yaratish."""
    if created:
        from .models import UserRating
        UserRating.objects.get_or_create(user=instance)


def connect_user_signal():
    """User model signal ni ulash (apps.py ready() dan chaqiriladi)."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    post_save.connect(create_user_rating, sender=User)

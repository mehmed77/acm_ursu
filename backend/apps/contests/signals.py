"""
Signals for contest submission tracking.
Submission status o'zgarganda contest scoreboardni yangilash.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
import logging

from apps.submissions.models import Submission

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Submission)
def handle_submission_status_change(sender, instance, **kwargs):
    """
    Submission saqlanganda kontest scoreboard ni yangilash.
    Faqat aniq natija bo'lganda (pending/running emas).
    """
    if instance.status in ('pending', 'running'):
        return

    try:
        from .models import ContestSubmission
        cs = ContestSubmission.objects.filter(
            submission=instance
        ).first()

        if cs:
            from .scoring import recalculate_scoreboard
            recalculate_scoreboard(cs.contest)
            logger.info(f'Scoreboard updated via signal: contest #{cs.contest_id}')
    except Exception:
        logger.exception(
            f'Contest score yangilashda xato: submission #{instance.id}'
        )

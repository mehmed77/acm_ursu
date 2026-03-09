from celery import shared_task
from celery.utils.log import get_task_logger
from django.utils import timezone

logger = get_task_logger(__name__)

# KRITIK FIX: task nomi to'liq path bilan
# celery.py dagi nom AYNAN shu bo'lishi shart!
TASK_FINALIZE   = 'apps.contests.tasks.finalize_contest'
TASK_SYNC       = 'apps.contests.tasks.sync_contest_statuses'


@shared_task(
    bind                = True,
    max_retries         = 3,
    default_retry_delay = 30,
    name                = TASK_FINALIZE,
)
def finalize_contest(self, contest_id: int):
    """
    Contest tugagandan keyin:
    1. Status → finished
    2. Scoreboard muzlatishni ochish
    3. Reyting hisoblash

    Celery orqali ishlaydi — HTTP zapros yo'q.
    """
    logger.info(f'🏁 finalize_contest #{contest_id}')

    try:
        from .models import Contest
        contest = Contest.objects.get(id=contest_id)
    except Contest.DoesNotExist:
        logger.error(f'  ❌ Contest #{contest_id} topilmadi')
        return

    try:
        # ── Status yangilash ──────────────────────
        if contest.status != 'finished':
            contest.status = 'finished'
            contest.save(update_fields=['status'])
            logger.info('  ✅ Status → finished')

        # ── Scoreboard muzlatishni ochish ──────────
        if getattr(contest, 'is_frozen', False):
            contest.is_frozen = False
            contest.save(update_fields=['is_frozen'])
            logger.info('  ✅ Scoreboard muzlatishi ochildi')

        # ── Reyting hisoblash ─────────────────────
        if (
            contest.is_rated
            and not contest.rating_calculated
            and not contest.rating_calculating  # race condition
        ):
            # KRITIK FIX: darhol flag qo'y
            contest.rating_calculating = True
            contest.save(update_fields=['rating_calculating'])

            logger.info('  📊 Reyting hisoblash boshlanadi...')

            from .scoring import run_rating_calculation
            result = run_rating_calculation(contest)

            if result['success']:
                logger.info(
                    f'  ✅ Reyting hisoblandi: '
                    f'{result.get("count", 0)} ta ishtirokchi'
                )
            else:
                logger.error(
                    f'  ❌ Xato: {result["error"]}'
                )
                raise Exception(result['error'])

        else:
            reason = (
                'is_rated=False'           if not contest.is_rated else
                'allaqachon hisoblangan'    if contest.rating_calculated else
                'hisoblash davom etmoqda'   if contest.rating_calculating else
                'noma\'lum'
            )
            logger.info(f'  ⏭ Reyting o\'tkazildi: {reason}')

            # Rated bo'lmasa flagni qo'y
            if not contest.is_rated and not contest.rating_calculated:
                _mark_done(contest)

    except Exception as exc:
        logger.error(
            f'  ❌ finalize_contest xatosi: {exc}',
            exc_info=True,
        )
        raise self.retry(exc=exc)


@shared_task(name=TASK_SYNC)
def sync_contest_statuses():
    """
    Celery Beat tomonidan har daqiqada chaqiriladi.
    Barcha aktiv contestlar statusini tekshiradi.
    """
    from .models import Contest

    now = timezone.now()

    # Boshlanishi kerak bo'lgan contestlar
    started = Contest.objects.filter(
        status     = 'upcoming',
        start_time__lte = now,
        end_time__gt    = now,
    )
    for c in started:
        c.status = 'running'
        c.save(update_fields=['status'])
        logger.info(f'🟢 Contest #{c.id} "{c.title}" boshlandi')

    # Tugashi kerak bo'lgan contestlar
    finished = Contest.objects.filter(
        status      = 'running',
        end_time__lte = now,
    )
    for c in finished:
        logger.info(
            f'⏰ Contest #{c.id} "{c.title}" tugadi '
            f'— finalize ishga tushirildi'
        )
        finalize_contest.delay(c.id)

    # KRITIK FIX: o'tkazib yuborilgan contestlar
    # (finalize_contest ishlamagan bo'lsa)
    missed = Contest.objects.filter(
        status             = 'finished',
        is_rated           = True,
        rating_calculated  = False,
        rating_calculating = False,  # hisoblash davom etmayapti
    )
    for c in missed:
        logger.warning(
            f'⚠ Contest #{c.id} — reyting '
            f'hisobllanmagan, qayta ishga tushirildi'
        )
        finalize_contest.delay(c.id)


def _mark_done(contest) -> None:
    contest.rating_calculated  = True
    contest.rating_calculating = False
    contest.save(
        update_fields=['rating_calculated', 'rating_calculating']
    )

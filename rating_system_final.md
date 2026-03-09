# Codeforces Reyting Tizimi — Barcha Tuzatishlar Bilan

## Muhim: Quyidagi tartibda bajaring

1. Migration
2. rating_engine.py
3. scoring.py
4. tasks.py
5. celery.py
6. views.py + urls.py
7. Unit test
8. Tekshiruv

---

## 0. O'RNATISH

```bash
python manage.py check   # oldin xato yo'qligini tekshir
```

---

## 1. MODEL O'ZGARISHLAR

### `apps/contests/models.py`:

```python
# RANK DARAJALARI — faylning boshiga qo'sh (import dan keyin)
RANK_LEVELS = [
    (0,    800,  'Newbie',                    '#808080'),
    (800,  1200, 'Pupil',                     '#008000'),
    (1200, 1400, 'Specialist',                '#03a89e'),
    (1400, 1600, 'Expert',                    '#0000ff'),
    (1600, 1900, 'Candidate Master',          '#aa00aa'),
    (1900, 2100, 'Master',                    '#ff8c00'),
    (2100, 2300, 'International Master',      '#ff8c00'),
    (2300, 2400, 'Grandmaster',               '#ff0000'),
    (2400, 2600, 'International Grandmaster', '#ff0000'),
    (2600, 9999, 'Legendary Grandmaster',     '#ff0000'),
]

def get_rank_title(rating: int) -> str:
    for low, high, title, _ in RANK_LEVELS:
        if low <= rating < high:
            return title
    return 'Legendary Grandmaster'

def get_rank_color(rating: int) -> str:
    for low, high, _, color in RANK_LEVELS:
        if low <= rating < high:
            return color
    return '#ff0000'


class Contest(models.Model):
    # ... mavjud fieldlar ...

    is_rated           = models.BooleanField(default=True)
    rating_calculated  = models.BooleanField(default=False)

    # KRITIK FIX: race condition oldini olish uchun
    rating_calculating = models.BooleanField(
        default=False,
        help_text='Hisoblash jarayonida (race condition himoyasi)'
    )
    rating_frozen      = models.BooleanField(default=False)

    def get_rank_title(self, rating: int) -> str:
        return get_rank_title(rating)


class RatingChange(models.Model):
    user    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete    = models.CASCADE,
        related_name = 'rating_changes',
    )
    contest = models.ForeignKey(
        'Contest',
        on_delete    = models.CASCADE,
        related_name = 'rating_changes',
    )

    old_rating     = models.IntegerField(default=0)
    new_rating     = models.IntegerField(default=0)
    delta          = models.IntegerField(default=0)

    rank           = models.IntegerField()
    expected_rank  = models.FloatField(default=0)

    solved_count   = models.IntegerField(default=0)
    penalty        = models.IntegerField(default=0)

    old_rank_title = models.CharField(max_length=50, blank=True)
    new_rank_title = models.CharField(max_length=50, blank=True)

    calculated_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'contest')
        ordering        = ['rank']

    def __str__(self):
        sign = '+' if self.delta >= 0 else ''
        return (
            f'{self.user.username}: '
            f'{self.old_rating} → {self.new_rating} '
            f'({sign}{self.delta})'
        )
```

### `apps/accounts/models.py`:

```python
class User(AbstractUser):
    # ... mavjud fieldlar ...

    # KRITIK FIX: max_rating migration shart!
    rating     = models.IntegerField(
        default  = 0,
        help_text = 'Joriy reyting'
    )
    max_rating = models.IntegerField(
        default  = 0,
        help_text = 'Eng yuqori reyting'
    )

    @property
    def rank_title(self) -> str:
        from apps.contests.models import get_rank_title
        return get_rank_title(self.rating)

    @property
    def rank_color(self) -> str:
        from apps.contests.models import get_rank_color
        return get_rank_color(self.rating)
```

```bash
# Migration
python manage.py makemigrations contests accounts
python manage.py migrate
python manage.py check   # xato yo'q bo'lishi kerak
```

---

## 2. RATING ENGINE

### `apps/contests/rating_engine.py` — TO'LIQ YANGI FAYL:

```python
"""
Codeforces uslubida reyting hisoblash.
Sof Python — tashqi HTTP zapros yo'q.

Algoritm:
  1. Win probability: P(i>j) = 1/(1+6^((Rj-Ri)/400))
  2. Expected rank:   1 + sum(P(j>i) for j!=i)
  3. Mid rank:        sqrt(expected * actual)
  4. Seed (binary search): yangi reyting topish
  5. Delta:           (seed - old_rating) / 2
  6. Muvozanat:       sum(deltas) ≈ 0
  7. 1-o'rin himoya:  top_user >= +1
  8. Minimal reyting: 1
"""
import math
import logging

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────
# RANK DARAJALARI
# ─────────────────────────────────────────────────────────

RANK_LEVELS = [
    (0,    800,  'Newbie',                    '#808080'),
    (800,  1200, 'Pupil',                     '#008000'),
    (1200, 1400, 'Specialist',                '#03a89e'),
    (1400, 1600, 'Expert',                    '#0000ff'),
    (1600, 1900, 'Candidate Master',          '#aa00aa'),
    (1900, 2100, 'Master',                    '#ff8c00'),
    (2100, 2300, 'International Master',      '#ff8c00'),
    (2300, 2400, 'Grandmaster',               '#ff0000'),
    (2400, 2600, 'International Grandmaster', '#ff0000'),
    (2600, 9999, 'Legendary Grandmaster',     '#ff0000'),
]


def get_rank_title(rating: int) -> str:
    for low, high, title, _ in RANK_LEVELS:
        if low <= rating < high:
            return title
    return 'Legendary Grandmaster'


def get_rank_color(rating: int) -> str:
    for low, high, _, color in RANK_LEVELS:
        if low <= rating < high:
            return color
    return '#ff0000'


# ─────────────────────────────────────────────────────────
# YORDAMCHI FUNKSIYALAR
# ─────────────────────────────────────────────────────────

def _win_probability(rating_a: float, rating_b: float) -> float:
    """
    A ning B ni yutish ehtimoli.
    Formula: 1 / (1 + 6^((Rb - Ra) / 400))
    """
    return 1.0 / (1.0 + math.pow(6.0, (rating_b - rating_a) / 400.0))


def _get_expected_rank(ratings: list, index: int) -> float:
    """
    index-chi ishtirokchining kutilgan o'rni.
    = 1 + sum(P(j beats i) for j != i)
    """
    rating_i = ratings[index]
    expected = 1.0
    for j, rating_j in enumerate(ratings):
        if j != index:
            expected += _win_probability(rating_j, rating_i)
    return expected


def _seed(ratings: list, extra_rating: float) -> float:
    """
    extra_rating ga ega yangi ishtirokchining
    kutilgan o'rni (binary search uchun).
    """
    result = 1.0
    for r in ratings:
        result += _win_probability(r, extra_rating)
    return result


def _find_rating_for_rank(ratings: list, rank: float) -> int:
    """
    Binary search: qaysi reyting
    berilgan rank ga mos keladi?
    """
    left, right = 1, 8000
    while right - left > 1:
        mid = (left + right) // 2
        if _seed(ratings, mid) < rank:
            right = mid
        else:
            left = mid
    return left


# ─────────────────────────────────────────────────────────
# ASOSIY FUNKSIYA
# ─────────────────────────────────────────────────────────

def calculate_rating_changes(participants: list) -> list:
    """
    Codeforces algoritmida reyting o'zgarishini hisoblaydi.

    Args:
        participants: o'rin bo'yicha tartiblangan ro'yxat
        [
            {
                'user_id':    int,
                'username':   str,
                'old_rating': int,
                'rank':       int,   # 1-dan, tie bo'lishi mumkin
                'solved':     int,
                'penalty':    int,
            },
            ...
        ]

    Returns:
        [
            {
                'user_id':        int,
                'username':       str,
                'old_rating':     int,
                'new_rating':     int,
                'delta':          int,
                'rank':           int,
                'expected_rank':  float,
                'old_rank_title': str,
                'new_rank_title': str,
            },
            ...
        ]
    """
    n = len(participants)

    # ── 1 ta yoki 0 ta ishtirokchi ────────────────
    if n < 2:
        logger.warning(
            'Reyting hisoblash uchun kamida '
            '2 ta ishtirokchi kerak'
        )
        return [{
            **p,
            'new_rating':     p['old_rating'],
            'delta':          0,
            'expected_rank':  1.0,
            'old_rank_title': get_rank_title(p['old_rating']),
            'new_rank_title': get_rank_title(p['old_rating']),
        } for p in participants]

    ratings = [float(p['old_rating']) for p in participants]

    # ── 2. Kutilgan o'rinlar ──────────────────────
    expected_ranks = [
        _get_expected_rank(ratings, i)
        for i in range(n)
    ]

    # ── 3. Geometric mean (o'rtacha o'rin) ────────
    actual_ranks = [float(p['rank']) for p in participants]
    mid_ranks = [
        math.sqrt(expected_ranks[i] * actual_ranks[i])
        for i in range(n)
    ]

    # ── 4. Binary search — yangi reyting ──────────
    deltas = []
    for i in range(n):
        other = [ratings[j] for j in range(n) if j != i]
        new_r = _find_rating_for_rank(other, mid_ranks[i])
        delta = (new_r - int(ratings[i])) // 2
        deltas.append(delta)

    # ── 5. Muvozanat korreksiyasi ─────────────────
    total    = sum(deltas)
    inc      = max(
        -max(deltas),
        min(0, -(total // n + 1))
    )
    deltas   = [d + inc for d in deltas]

    # ── 6. 1-o'rin himoyasi (kamida +1) ───────────
    if deltas[0] < 1:
        deficit = 1 - deltas[0]
        deltas[0] = 1
        # Defitsitni eng yuqori delta lardan olish
        indexed = sorted(
            range(1, n),
            key=lambda x: -deltas[x]
        )
        for idx in indexed:
            if deficit <= 0:
                break
            take = min(deficit, deltas[idx] + 100)
            deltas[idx] -= take
            deficit     -= take

    # ── 7. Natijalarni yig'ish ─────────────────────
    results = []
    for i, p in enumerate(participants):
        old_r = p['old_rating']
        # Minimal reyting: 1
        delta = max(deltas[i], 1 - old_r)
        new_r = max(1, old_r + delta)

        results.append({
            'user_id':        p['user_id'],
            'username':       p['username'],
            'old_rating':     old_r,
            'new_rating':     new_r,
            'delta':          new_r - old_r,
            'rank':           p['rank'],
            'solved':         p.get('solved', 0),
            'penalty':        p.get('penalty', 0),
            'expected_rank':  round(expected_ranks[i], 2),
            'old_rank_title': get_rank_title(old_r),
            'new_rank_title': get_rank_title(new_r),
        })

    # ── Log ──────────────────────────────────────
    logger.info('── Reyting o\'zgarishlari ──────────')
    for r in results:
        sign = '+' if r['delta'] >= 0 else ''
        logger.info(
            f"  {r['rank']:>3}. {r['username']:<20} "
            f"{r['old_rating']:>4} → {r['new_rating']:>4} "
            f"({sign}{r['delta']:>4})  "
            f"{r['old_rank_title']} → {r['new_rank_title']}"
        )

    return results
```

---

## 3. SCORING SERVICE

### `apps/contests/scoring.py` — TO'LIQ QAYTA YOZ:

```python
"""
Contest tugagandan keyin scoreboard va
reyting hisoblash.
"""
import logging
from django.db   import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────
# KRITIK FIX 1: Scoreboard rank hisoblash (tie bilan)
# ─────────────────────────────────────────────────────────

def recalculate_scoreboard(contest) -> None:
    """
    Contest scoreboard ni qayta hisoblaydi.
    Reyting hisoblashdan OLDIN chaqirilishi shart.
    """
    from .models import ScoreboardEntry

    entries = list(
        ScoreboardEntry.objects.filter(
            contest    = contest,
            is_virtual = False,
        ).select_related('user')
    )

    if not entries:
        return

    # KRITIK FIX: Tie-breaking to'g'ri
    # Ko'proq masala → birinchi
    # Teng masalada: kam penalty → birinchi
    # Hamon teng → BIR XIL O'RIN (tie)
    sorted_entries = sorted(
        entries,
        key=lambda e: (-(e.solved_count or 0), e.penalty or 0)
    )

    rank = 1
    to_update = []

    for i, entry in enumerate(sorted_entries):
        if i > 0:
            prev = sorted_entries[i - 1]
            is_tie = (
                entry.solved_count == prev.solved_count
                and entry.penalty  == prev.penalty
            )
            if not is_tie:
                rank = i + 1   # yangi rank faqat tie bo'lmasa

        entry.rank = rank
        to_update.append(entry)

    # Bulk update — bitta query
    ScoreboardEntry.objects.bulk_update(to_update, ['rank'])

    logger.info(
        f'  📊 Scoreboard yangilandi: '
        f'{len(entries)} ta ishtirokchi'
    )


# ─────────────────────────────────────────────────────────
# ASOSIY FUNKSIYA
# ─────────────────────────────────────────────────────────

def run_rating_calculation(contest) -> dict:
    """
    1. Scoreboard ni yangilaydi (rank bilan)
    2. Codeforces algoritmi bilan hisoblaydi
    3. RatingChange + User.rating atomik yozadi
    4. contest.rating_calculated = True qiladi

    Returns:
        {'success': True,  'count': N}
        {'success': False, 'error': '...'}
    """
    from .models import ScoreboardEntry, RatingChange
    from .rating_engine import calculate_rating_changes

    logger.info(
        f'🏆 Reyting hisoblash: '
        f'contest #{contest.id} "{contest.title}"'
    )

    # ── Tekshiruvlar ──────────────────────────────
    if not contest.is_rated:
        logger.info('  ⏭ is_rated=False')
        _mark_calculated(contest)
        return {'success': True, 'count': 0, 'skipped': True}

    if contest.status != 'finished':
        return {
            'success': False,
            'error':   f'Contest holati "{contest.status}" '
                       f'(finished bo\'lishi kerak)',
        }

    if contest.rating_calculated:
        logger.info('  ⏭ Allaqachon hisoblangan')
        return {'success': True, 'count': 0, 'already_done': True}

    # KRITIK FIX 1: Avval scoreboard rank ni yangilash
    recalculate_scoreboard(contest)

    # ── Ishtirokchilarni olish ────────────────────
    entries = list(
        ScoreboardEntry.objects.filter(
            contest    = contest,
            is_virtual = False,
        ).select_related('user').order_by('rank', 'penalty')
    )

    logger.info(f'  👥 Ishtirokchilar: {len(entries)} ta')

    if len(entries) < 2:
        logger.warning('  ⚠ Kamida 2 ta ishtirokchi kerak')
        _mark_calculated(contest)
        return {'success': True, 'count': 0}

    # ── Codeforces algoritmi uchun ma'lumot ───────
    participants = [{
        'user_id':    entry.user.id,
        'username':   entry.user.username,
        'old_rating': getattr(entry.user, 'rating', 0) or 0,
        'rank':       entry.rank or 1,
        'solved':     entry.solved_count or 0,
        'penalty':    entry.penalty or 0,
    } for entry in entries]

    # ── Hisoblash ─────────────────────────────────
    try:
        changes = calculate_rating_changes(participants)
    except Exception as e:
        logger.exception(f'  ❌ Algoritm xatosi: {e}')
        # Race condition flagini tozalash
        contest.rating_calculating = False
        contest.save(update_fields=['rating_calculating'])
        return {'success': False, 'error': str(e)}

    # ── Atomik yozish ─────────────────────────────
    try:
        with transaction.atomic():
            from django.contrib.auth import get_user_model
            User = get_user_model()

            for change in changes:
                # User reytingini yangilash
                user = User.objects.select_for_update().get(
                    id=change['user_id']
                )

                old_max        = getattr(user, 'max_rating', 0) or 0
                user.rating    = change['new_rating']
                user.max_rating = max(old_max, change['new_rating'])
                user.save(update_fields=['rating', 'max_rating'])

                # RatingChange yozuvi
                RatingChange.objects.update_or_create(
                    user    = user,
                    contest = contest,
                    defaults = {
                        'old_rating':     change['old_rating'],
                        'new_rating':     change['new_rating'],
                        'delta':          change['delta'],
                        'rank':           change['rank'],
                        'expected_rank':  change['expected_rank'],
                        'solved_count':   change.get('solved', 0),
                        'penalty':        change.get('penalty', 0),
                        'old_rank_title': change['old_rank_title'],
                        'new_rank_title': change['new_rank_title'],
                    }
                )

            # Contest flaglari
            contest.rating_calculated  = True
            contest.rating_calculating = False
            contest.save(
                update_fields=[
                    'rating_calculated',
                    'rating_calculating'
                ]
            )

    except Exception as e:
        logger.exception(f'  ❌ DB yozishda xato: {e}')
        contest.rating_calculating = False
        contest.save(update_fields=['rating_calculating'])
        return {'success': False, 'error': str(e)}

    logger.info(
        f'  ✅ Reyting hisoblandi: '
        f'{len(changes)} ta ishtirokchi'
    )
    return {'success': True, 'count': len(changes)}


def _mark_calculated(contest) -> None:
    """Contest reyting hisoblandi deb belgilaydi."""
    contest.rating_calculated  = True
    contest.rating_calculating = False
    contest.save(
        update_fields=['rating_calculated', 'rating_calculating']
    )
```

---

## 4. CELERY TASKS

### `apps/contests/tasks.py` — TO'LIQ QAYTA YOZ:

```python
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
```

---

## 5. CELERY KONFIGURATSIYA

### `config/celery.py`:

```python
from celery.schedules import crontab

# KRITIK FIX: task nomi tasks.py dagi bilan AYNAN bir xil
app.conf.beat_schedule = {
    'sync-contest-statuses': {
        'task':     'apps.contests.tasks.sync_contest_statuses',
        'schedule': 60.0,
    },
}

app.conf.timezone = 'Asia/Tashkent'
```

---

## 6. API

### `apps/contests/views.py` ga qo'sh:

```python
class ContestRatingView(APIView):
    """
    GET /api/contests/:slug/rating/
    Frontend polling uchun.
    """
    permission_classes = [AllowAny]

    def get(self, request, slug):
        from .models import Contest, RatingChange

        contest = get_object_or_404(Contest, slug=slug)

        # Rated emas
        if not contest.is_rated:
            return Response({
                'available': True,
                'is_rated':  False,
                'changes':   [],
            })

        # Hisoblash davom etmoqda
        if not contest.rating_calculated:
            return Response({
                'available':    False,
                'is_rated':     True,
                'calculating':  contest.rating_calculating,
                'message':      'Hisoblash jarayonida...',
            })

        # Hisoblandi
        changes = RatingChange.objects.filter(
            contest=contest
        ).select_related('user').order_by('rank')

        # Joriy foydalanuvchi
        my_change = None
        if request.user.is_authenticated:
            mine = changes.filter(user=request.user).first()
            if mine:
                my_change = {
                    'old_rating':     mine.old_rating,
                    'new_rating':     mine.new_rating,
                    'delta':          mine.delta,
                    'rank':           mine.rank,
                    'old_rank_title': mine.old_rank_title,
                    'new_rank_title': mine.new_rank_title,
                }

        return Response({
            'available': True,
            'is_rated':  True,
            'my_change': my_change,
            'changes': [{
                'username':       rc.user.username,
                'avatar_url':     getattr(rc.user, 'avatar_url', ''),
                'old_rating':     rc.old_rating,
                'new_rating':     rc.new_rating,
                'delta':          rc.delta,
                'rank':           rc.rank,
                'solved_count':   rc.solved_count,
                'old_rank_title': rc.old_rank_title,
                'new_rank_title': rc.new_rank_title,
            } for rc in changes],
        })


class AdminRecalculateRatingView(APIView):
    """
    POST /api/admin/contests/:slug/recalculate-rating/
    Admin uchun qo'lda qayta hisoblash.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, slug):
        from .models import Contest, RatingChange
        from .tasks  import finalize_contest

        contest = get_object_or_404(Contest, slug=slug)

        if contest.status != 'finished':
            return Response(
                {'detail': 'Musobaqa hali tugamagan'},
                status=400
            )

        # Reset
        RatingChange.objects.filter(contest=contest).delete()
        contest.rating_calculated  = False
        contest.rating_calculating = False
        contest.save(
            update_fields=[
                'rating_calculated',
                'rating_calculating'
            ]
        )

        # Celery orqali qayta hisoblash
        finalize_contest.delay(contest.id)

        return Response({
            'success': True,
            'message': 'Qayta hisoblash boshlandi. '
                       '30-60 soniyadan keyin tayyor bo\'ladi.',
        })
```

### `config/urls.py` ga qo'sh:

```python
path('api/contests/<slug:slug>/rating/',
    ContestRatingView.as_view()),
path('api/admin/contests/<slug:slug>/recalculate-rating/',
    AdminRecalculateRatingView.as_view()),
```

---

## 7. UNIT TEST

### `apps/contests/tests/test_rating_engine.py` — YANGI FAYL:

```python
from django.test import TestCase
from apps.contests.rating_engine import (
    calculate_rating_changes,
    get_rank_title,
    _win_probability,
)


class RatingEngineTest(TestCase):

    def _make(self, user_id, username, old_rating, rank,
              solved=3, penalty=90):
        return {
            'user_id':    user_id,
            'username':   username,
            'old_rating': old_rating,
            'rank':       rank,
            'solved':     solved,
            'penalty':    penalty,
        }

    def test_win_probability_equal_ratings(self):
        """Teng reytingda 50% ehtimol."""
        p = _win_probability(1200, 1200)
        self.assertAlmostEqual(p, 0.5, places=2)

    def test_win_probability_higher_wins_more(self):
        """Yuqori reyting ko'proq yutadi."""
        p_high = _win_probability(1600, 1200)
        p_low  = _win_probability(1200, 1600)
        self.assertGreater(p_high, p_low)
        self.assertGreater(p_high, 0.5)
        self.assertLess(p_low, 0.5)

    def test_two_equal_players_winner_gets_plus(self):
        """Teng reyting: g'olib + oladi, yutqazuvchi - oladi."""
        participants = [
            self._make(1, 'winner', 1200, rank=1),
            self._make(2, 'loser',  1200, rank=2),
        ]
        results = calculate_rating_changes(participants)
        winner = next(r for r in results if r['user_id'] == 1)
        loser  = next(r for r in results if r['user_id'] == 2)

        self.assertGreater(winner['delta'], 0)
        self.assertLess(loser['delta'], 0)
        self.assertEqual(winner['new_rating'], 1200 + winner['delta'])

    def test_single_participant_no_change(self):
        """1 ta ishtirokchi — reyting o'zgarmaydi."""
        participants = [self._make(1, 'solo', 1200, rank=1)]
        results = calculate_rating_changes(participants)
        self.assertEqual(results[0]['delta'], 0)
        self.assertEqual(results[0]['new_rating'], 1200)

    def test_minimum_rating_never_below_1(self):
        """Reyting hech qachon 1 dan past bo'lmaydi."""
        participants = [
            self._make(1, 'low1', 1, rank=1),
            self._make(2, 'low2', 1, rank=2),
        ]
        results = calculate_rating_changes(participants)
        for r in results:
            self.assertGreaterEqual(r['new_rating'], 1)

    def test_first_place_gets_positive_delta(self):
        """1-o'rin kamida +1 oladi."""
        participants = [
            self._make(i+1, f'user_{i+1}', 1200, rank=i+1)
            for i in range(5)
        ]
        results = calculate_rating_changes(participants)
        first = results[0]
        self.assertGreaterEqual(first['delta'], 1)

    def test_tie_same_rank(self):
        """Teng o'rindagi ishtirokchilar bir xil delta oladi."""
        participants = [
            self._make(1, 'user_a', 1200, rank=1),
            self._make(2, 'user_b', 1200, rank=1),  # tie
            self._make(3, 'user_c', 1200, rank=3),
        ]
        results = calculate_rating_changes(participants)
        user_a = next(r for r in results if r['user_id'] == 1)
        user_b = next(r for r in results if r['user_id'] == 2)
        # Tie bo'lganda taxminan bir xil delta
        self.assertAlmostEqual(
            user_a['delta'], user_b['delta'], delta=5
        )

    def test_rank_titles(self):
        """Rank darajalari to'g'ri."""
        self.assertEqual(get_rank_title(0),    'Newbie')
        self.assertEqual(get_rank_title(799),  'Newbie')
        self.assertEqual(get_rank_title(800),  'Pupil')
        self.assertEqual(get_rank_title(1199), 'Pupil')
        self.assertEqual(get_rank_title(1200), 'Specialist')
        self.assertEqual(get_rank_title(1400), 'Expert')
        self.assertEqual(get_rank_title(1600), 'Candidate Master')
        self.assertEqual(get_rank_title(1900), 'Master')
        self.assertEqual(get_rank_title(2300), 'Grandmaster')
        self.assertEqual(get_rank_title(2600), 'Legendary Grandmaster')

    def test_rank_change_on_threshold(self):
        """Rank darajasi chegarada o'zgaradi."""
        participants = [
            self._make(1, 'almost_pupil', 799, rank=1),
            self._make(2, 'strong',       1600, rank=2),
        ]
        results = calculate_rating_changes(participants)
        winner = next(r for r in results if r['user_id'] == 1)

        if winner['new_rating'] >= 800:
            self.assertEqual(winner['new_rank_title'], 'Pupil')
        else:
            self.assertEqual(winner['new_rank_title'], 'Newbie')

    def test_ten_participants(self):
        """10 ta ishtirokchi — barcha natijalar to'g'ri."""
        participants = [
            self._make(i+1, f'user_{i+1}', 1000 + i*100, rank=i+1)
            for i in range(10)
        ]
        results = calculate_rating_changes(participants)

        self.assertEqual(len(results), 10)

        # Barcha new_rating >= 1
        for r in results:
            self.assertGreaterEqual(r['new_rating'], 1)

        # 1-o'rin >= +1
        first = min(results, key=lambda x: x['rank'])
        self.assertGreaterEqual(first['delta'], 1)
```

```bash
# Testlarni ishga tushirish
python manage.py test apps.contests.tests.test_rating_engine -v 2

# Kutilayotgan natija:
# test_first_place_gets_positive_delta ... ok
# test_minimum_rating_never_below_1 ... ok
# test_rank_change_on_threshold ... ok
# test_rank_titles ... ok
# test_single_participant_no_change ... ok
# test_ten_participants ... ok
# test_tie_same_rank ... ok
# test_two_equal_players_winner_gets_plus ... ok
# test_win_probability_equal_ratings ... ok
# test_win_probability_higher_wins_more ... ok
# Ran 10 tests in 0.XXXs
# OK
```

---

## 8. TEKSHIRUV

```bash
# 1. Migration
python manage.py makemigrations contests accounts
python manage.py migrate
python manage.py check   # ← xato yo'q bo'lishi shart

# 2. Unit testlar
python manage.py test apps.contests.tests.test_rating_engine -v 2

# 3. Celery ishga tushirish (uch alohida terminal)
# Terminal 1 — Django server:
python manage.py runserver

# Terminal 2 — Celery worker:
celery -A config worker --loglevel=info

# Terminal 3 — Celery Beat:
celery -A config beat --loglevel=info

# 4. Qo'lda sinash (contest id=1 bo'lsa)
python manage.py shell
>>> from apps.contests.scoring import run_rating_calculation
>>> from apps.contests.models import Contest
>>> c = Contest.objects.get(id=1)
>>> c.status = 'finished'; c.save()
>>> result = run_rating_calculation(c)
>>> print(result)
# {'success': True, 'count': N}

# 5. Kutilayotgan Celery log:
# 🏁 finalize_contest #1
# ✅ Status → finished
# 📊 Reyting hisoblash boshlanadi...
# 📊 Scoreboard yangilandi: N ta ishtirokchi
# ── Reyting o'zgarishlari ──────────
#    1. mehmed_77    1200 → 1248 ( +48) Specialist → Specialist
#    2. user_2        950 →  930 ( -20) Pupil → Pupil
# ✅ Reyting hisoblandi: 2 ta ishtirokchi
```

---

## TEKSHIRUV RO'YXATI

```
KRITIK FIXLAR:
  ✅ Scoreboard rank avval hisoblanadi (reyting oldin)
  ✅ Tie-breaking to'g'ri (bir xil natija = bir xil o'rin)
  ✅ max_rating field migration bilan qo'shiladi
  ✅ Race condition: rating_calculating flag
  ✅ Task nomi celery.py + tasks.py da aynan bir xil
  ✅ 10 ta unit test — algoritm to'g'riligini tasdiqlaydi

ALGORITM:
  ✅ Win probability: 1/(1+6^((Rb-Ra)/400))
  ✅ Expected rank hisoblash
  ✅ Geometric mean (mid rank)
  ✅ Binary search (seed reyting)
  ✅ Muvozanat korreksiyasi
  ✅ 1-o'rin himoyasi (kamida +1)
  ✅ Minimal reyting: 1

CELERY:
  ✅ finalize_contest: max_retries=3, delay=30s
  ✅ sync_contest_statuses: har 60 soniya
  ✅ Missed contestlar aniqlash va qayta ishlatish
  ✅ rating_calculating flag — ikki marta chaqirilmaydi

API:
  ✅ GET /api/contests/:slug/rating/
  ✅ POST /api/admin/contests/:slug/recalculate-rating/
```

# Codeforces Uslubida Reyting Hisoblash Tizimi

## Maqsad
Contest tugagandan keyin ishtirokchilar reytingini
Codeforces algoritmiga asosan Celery orqali
avtomatik hisoblash. Har safar tashqi zapros
yuborilmaydi — hamma narsa server ichida.

---

## CODEFORCES REYTING ALGORITMINI TUSHUNISH

### Asosiy formula

Codeforces Elo-based tizimdan foydalanadi.
Har bir ishtirokchi uchun kutilgan o'rin va
haqiqiy o'rin farqi asosida reyting o'zgaradi.

```
1. Har bir (i, j) juft uchun:
   P(i beats j) = 1 / (1 + 6^((r_j - r_i) / 400))

2. Ishtirokchi i uchun kutilgan o'rin:
   expected_rank[i] = 1 + sum(P(j beats i) for j != i)

3. Haqiqiy o'rin:
   actual_rank[i] = scoreboard dagi o'rin

4. "O'rtacha" o'rin:
   mid_rank[i] = sqrt(expected_rank[i] * actual_rank[i])

5. Yangi reyting (binary search):
   Shunday seed topamizki:
   expected_rank(seed, barcha boshqalar) == mid_rank[i]
   
   Bu yerda seed — yangi reytingdagi kutilgan o'rin

6. Delta:
   delta[i] = (seed - r[i]) / 2

7. Muvozanat (barcha deltalar yig'indisi 0 ga yaqin):
   inc = -sum(deltas) / len(participants)
   agar inc > 0: inc = 0   # faqat kamaytirish
   
   delta[i] += inc

8. Eng yuqori o'rin uchun:
   top_delta = max(delta) - delta[top_rank_user]
   Agar top_delta < 0: delta[0] -= top_delta
   
9. Yangi reyting:
   new_rating[i] = old_rating[i] + delta[i]
   
   Minimal reyting: 1 (manfiy bo'lmaydi)
```

### Rank darajalari

```python
RANK_LEVELS = [
    (0,    800,  'Newbie',           '#808080'),
    (800,  1200, 'Pupil',            '#008000'),
    (1200, 1400, 'Specialist',       '#03a89e'),
    (1400, 1600, 'Expert',           '#0000ff'),
    (1600, 1900, 'Candidate Master', '#aa00aa'),
    (1900, 2100, 'Master',           '#ff8c00'),
    (2100, 2300, 'International Master', '#ff8c00'),
    (2300, 2400, 'Grandmaster',      '#ff0000'),
    (2400, 2600, 'International Grandmaster', '#ff0000'),
    (2600, 9999, 'Legendary Grandmaster', '#ff0000'),
]
```

---

## 1. MODEL

### `apps/contests/models.py` — tekshir va qo'sh:

```python
class RatingChange(models.Model):
    """
    Har bir contest ishtirokchisining
    reyting o'zgarishini saqlaydi.
    """
    user         = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete  = models.CASCADE,
        related_name = 'rating_changes',
    )
    contest      = models.ForeignKey(
        Contest,
        on_delete  = models.CASCADE,
        related_name = 'rating_changes',
    )

    # Reyting
    old_rating   = models.IntegerField(default=0)
    new_rating   = models.IntegerField(default=0)
    delta        = models.IntegerField(default=0)

    # O'rin
    rank         = models.IntegerField(
        help_text='Scoreboard dagi o\'rin'
    )
    expected_rank = models.FloatField(default=0)

    # Masala natijalari
    solved_count  = models.IntegerField(default=0)
    penalty       = models.IntegerField(
        default=0,
        help_text='Daqiqalarda'
    )

    # Rank darajasi
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


class Contest(models.Model):
    # ... mavjud fieldlar ...

    # Reyting fieldlari — yo'q bo'lsa qo'sh
    is_rated           = models.BooleanField(default=True)
    rating_calculated  = models.BooleanField(default=False)
    rating_frozen      = models.BooleanField(default=False)

    def get_rank_title(self, rating: int) -> str:
        for low, high, title, _ in RANK_LEVELS:
            if low <= rating < high:
                return title
        return 'Legendary Grandmaster'
```

```bash
python manage.py makemigrations contests
python manage.py migrate
```

---

## 2. CODEFORCES REYTING ENGINE

### `apps/contests/rating_engine.py` — TO'LIQ YANGI FAYL:

```python
"""
Codeforces uslubida reyting hisoblash.

Manba: Codeforces blog va ochiq manbalar asosida.
https://codeforces.com/blog/entry/77890
"""
import math
import logging

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────
# RANK DARAJALARI
# ─────────────────────────────────────────────────

RANK_LEVELS = [
    (0,    800,  'Newbie',                      '#808080'),
    (800,  1200, 'Pupil',                       '#008000'),
    (1200, 1400, 'Specialist',                  '#03a89e'),
    (1400, 1600, 'Expert',                      '#0000ff'),
    (1600, 1900, 'Candidate Master',            '#aa00aa'),
    (1900, 2100, 'Master',                      '#ff8c00'),
    (2100, 2300, 'International Master',        '#ff8c00'),
    (2300, 2400, 'Grandmaster',                 '#ff0000'),
    (2400, 2600, 'International Grandmaster',   '#ff0000'),
    (2600, 9999, 'Legendary Grandmaster',       '#ff0000'),
]


def get_rank_title(rating: int) -> str:
    """Reyting bo'yicha daraja nomini qaytaradi."""
    for low, high, title, _ in RANK_LEVELS:
        if low <= rating < high:
            return title
    return 'Legendary Grandmaster'


def get_rank_color(rating: int) -> str:
    """Reyting bo'yicha rang qaytaradi."""
    for low, high, _, color in RANK_LEVELS:
        if low <= rating < high:
            return color
    return '#ff0000'


# ─────────────────────────────────────────────────
# ASOSIY ALGORITMLAR
# ─────────────────────────────────────────────────

def _win_probability(rating_a: float, rating_b: float) -> float:
    """
    A ning B ni yutish ehtimoli.
    Codeforces formulasi: 1 / (1 + 6^((b - a) / 400))
    """
    return 1.0 / (1.0 + math.pow(6.0, (rating_b - rating_a) / 400.0))


def _get_expected_rank(ratings: list[float], index: int) -> float:
    """
    index-chi ishtirokchining kutilgan o'rni.
    = 1 + sum(P(j beats i) for all j != i)
    """
    rating_i = ratings[index]
    expected = 1.0
    for j, rating_j in enumerate(ratings):
        if j != index:
            expected += _win_probability(rating_j, rating_i)
    return expected


def _seed(ratings: list[float], extra_rating: float) -> float:
    """
    extra_rating reytingdagi yangi ishtirokchining
    kutilgan o'rni (barcha mavjud ratings bilan).
    Binary search uchun yordamchi.
    """
    result = 1.0
    for r in ratings:
        result += _win_probability(r, extra_rating)
    return result


def _find_rating_for_rank(
    ratings: list[float],
    rank: float
) -> int:
    """
    Binary search: qaysi reyting berilgan rank ga mos keladi?
    """
    left, right = 1, 8000
    while right - left > 1:
        mid = (left + right) // 2
        if _seed(ratings, mid) < rank:
            right = mid
        else:
            left = mid
    return left


# ─────────────────────────────────────────────────
# ASOSIY FUNKSIYA
# ─────────────────────────────────────────────────

def calculate_rating_changes(participants: list[dict]) -> list[dict]:
    """
    Codeforces uslubida reyting o'zgarishini hisoblaydi.

    Args:
        participants: tartiblangan ro'yxat (1-o'rindagi birinchi)
        [
            {
                'user_id':    int,
                'username':   str,
                'old_rating': int,   # 0 bo'lishi mumkin (yangi)
                'rank':       int,   # 1-dan boshlanadi
                'solved':     int,
                'penalty':    int,
            },
            ...
        ]

    Returns:
        [
            {
                'user_id':      int,
                'username':     str,
                'old_rating':   int,
                'new_rating':   int,
                'delta':        int,
                'rank':         int,
                'expected_rank': float,
                'old_rank_title': str,
                'new_rank_title': str,
            },
            ...
        ]
    """
    n = len(participants)

    if n < 2:
        logger.warning(
            'Reyting hisoblash uchun kamida 2 ishtirokchi kerak'
        )
        # O'zgarish yo'q
        return [{
            **p,
            'new_rating':    p['old_rating'],
            'delta':         0,
            'expected_rank': 1.0,
            'old_rank_title': get_rank_title(p['old_rating']),
            'new_rank_title': get_rank_title(p['old_rating']),
        } for p in participants]

    # Reytinglar ro'yxati (tartib saqlangan)
    ratings = [float(p['old_rating']) for p in participants]

    # ── 1. Kutilgan o'rinlarni hisoblash ──────────
    expected_ranks = [
        _get_expected_rank(ratings, i)
        for i in range(n)
    ]

    # ── 2. "O'rtacha" o'rin ────────────────────────
    # mid_rank[i] = geometric mean(expected, actual)
    actual_ranks = [p['rank'] for p in participants]
    mid_ranks = [
        math.sqrt(expected_ranks[i] * actual_ranks[i])
        for i in range(n)
    ]

    # ── 3. Har bir ishtirokchi uchun yangi reyting ─
    # Binary search bilan seed reyting topiladi
    deltas = []
    for i in range(n):
        # Boshqa barcha ishtirokchilar reytingi
        other_ratings = [ratings[j] for j in range(n) if j != i]

        # Qaysi reyting mid_rank ga mos seed beradi?
        new_r = _find_rating_for_rank(other_ratings, mid_ranks[i])

        delta = (new_r - int(ratings[i])) // 2
        deltas.append(delta)

    # ── 4. Muvozanat: deltaları yig'indisi 0 ga yaqin ─
    total_sum = sum(deltas)
    n_participants = len(deltas)

    # Umumiy korreksiya (kamida 0)
    correction = max(
        -max(deltas),
        min(0, -(total_sum // n_participants + 1))
    )

    deltas = [d + correction for d in deltas]

    # ── 5. Eng yaxshi ishtirokchini himoya qilish ──
    # 1-o'rindagi ishtirokchi kamida +1 olishi kerak
    if n > 0 and deltas[0] < 1:
        deficit = 1 - deltas[0]
        deltas[0] += deficit
        # Defitsitni boshqalarga taqsimlash
        # (eng ko'p olganlardan olish)
        for i in range(1, n):
            if deficit <= 0:
                break
            give = min(deficit, deltas[i] - (-max(deltas)))
            if give > 0:
                deltas[i] -= give
                deficit   -= give

    # ── 6. Minimal reyting: 1 ─────────────────────
    results = []
    for i, p in enumerate(participants):
        old_r   = p['old_rating']
        delta   = max(deltas[i], 1 - old_r)  # minimal 1
        new_r   = max(1, old_r + delta)

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

    # Log
    logger.info('── Reyting o\'zgarishlari ──────────')
    for r in results:
        sign = '+' if r['delta'] >= 0 else ''
        logger.info(
            f"  {r['rank']:>3}. {r['username']:<20} "
            f"{r['old_rating']:>4} → {r['new_rating']:>4} "
            f"({sign}{r['delta']:>4})"
        )
    logger.info(f'  Jami: {n} ta ishtirokchi')

    return results
```

---

## 3. SCORING SERVICE

### `apps/contests/scoring.py` — TO'LIQ QAYTA YOZ:

```python
"""
Contest tugagandan keyin reyting hisoblash va saqlash.
"""
import logging
from django.db import transaction
from django.utils import timezone

from .rating_engine import calculate_rating_changes, get_rank_title
from .models import Contest, ScoreboardEntry, RatingChange

logger = logging.getLogger(__name__)


def run_rating_calculation(contest: Contest) -> dict:
    """
    Contest uchun reyting hisoblashni to'liq bajaradi:
    1. Scoreboard dan ishtirokchilarni oladi
    2. Codeforces algoritmi bilan hisoblaydi
    3. RatingChange modeliga yozadi
    4. User modelidagi reytingni yangilaydi
    5. Contest.rating_calculated = True qiladi

    Returns:
        {'success': True, 'count': N}
        {'success': False, 'error': '...'}
    """
    logger.info(
        f'🏆 Reyting hisoblash: contest #{contest.id} '
        f'"{contest.title}"'
    )

    # ── Tekshiruvlar ──────────────────────────────
    if not contest.is_rated:
        logger.info('  ⏭ is_rated=False — o\'tkazildi')
        _mark_calculated(contest)
        return {'success': True, 'count': 0, 'skipped': True}

    if contest.status not in ('finished',):
        return {
            'success': False,
            'error':   f'Contest holati: {contest.status} '
                       f'(finished bo\'lishi kerak)',
        }

    if contest.rating_calculated:
        logger.info('  ⏭ Allaqachon hisoblangan')
        return {'success': True, 'count': 0, 'already_done': True}

    # ── Scoreboard dan ishtirokchilarni olish ──────
    entries = list(
        ScoreboardEntry.objects.filter(
            contest    = contest,
            is_virtual = False,   # virtual ishtiroklar hisoblanmaydi
        )
        .select_related('user')
        .order_by('rank', 'penalty')
    )

    # O'rin bo'sh bo'lsa hisoblash
    if not all(e.rank for e in entries):
        _assign_ranks(entries)

    logger.info(f'  👥 Ishtirokchilar: {len(entries)} ta')

    if len(entries) < 2:
        logger.warning(
            '  ⚠ Kamida 2 ta ishtirokchi kerak. '
            'Reyting o\'zgartirilmadi.'
        )
        _mark_calculated(contest)
        return {'success': True, 'count': 0}

    # ── Codeforces algoritmi uchun ma'lumot tayyorlash ─
    participants = []
    for entry in entries:
        user       = entry.user
        old_rating = getattr(user, 'rating', 0) or 0

        participants.append({
            'user_id':    user.id,
            'username':   user.username,
            'old_rating': old_rating,
            'rank':       entry.rank or 1,
            'solved':     entry.solved_count or 0,
            'penalty':    entry.penalty or 0,
        })

    # ── Hisoblash ─────────────────────────────────
    try:
        changes = calculate_rating_changes(participants)
    except Exception as e:
        logger.exception(f'  ❌ Algoritm xatosi: {e}')
        return {'success': False, 'error': str(e)}

    # ── DB ga atomik yozish ────────────────────────
    try:
        with transaction.atomic():
            saved_count = 0

            for change in changes:
                user_id = change['user_id']

                # User modelini yangilash
                from django.contrib.auth import get_user_model
                User = get_user_model()
                user = User.objects.select_for_update().get(
                    id=user_id
                )

                # Eski max_rating ni saqlash
                old_max = getattr(user, 'max_rating', 0) or 0
                new_r   = change['new_rating']

                user.rating     = new_r
                user.max_rating = max(old_max, new_r)
                user.save(update_fields=['rating', 'max_rating'])

                # RatingChange yozuvi
                RatingChange.objects.update_or_create(
                    user    = user,
                    contest = contest,
                    defaults = {
                        'old_rating':    change['old_rating'],
                        'new_rating':    change['new_rating'],
                        'delta':         change['delta'],
                        'rank':          change['rank'],
                        'expected_rank': change['expected_rank'],
                        'solved_count':  change.get('solved', 0),
                        'penalty':       change.get('penalty', 0),
                        'old_rank_title': change['old_rank_title'],
                        'new_rank_title': change['new_rank_title'],
                    }
                )
                saved_count += 1

            # Contest flag
            _mark_calculated(contest)

    except Exception as e:
        logger.exception(f'  ❌ DB yozishda xato: {e}')
        return {'success': False, 'error': str(e)}

    logger.info(
        f'  ✅ Reyting hisoblandi: {saved_count} ta ishtirokchi'
    )
    return {'success': True, 'count': saved_count}


def _assign_ranks(entries: list) -> None:
    """Scoreboard yozuvlariga o'rin raqamini beradi."""
    # Avval solved_count (ko'p yaxshi), keyin penalty (kam yaxshi)
    sorted_entries = sorted(
        entries,
        key=lambda e: (-( e.solved_count or 0), e.penalty or 0)
    )
    for i, entry in enumerate(sorted_entries, 1):
        entry.rank = i
        entry.save(update_fields=['rank'])


def _mark_calculated(contest: Contest) -> None:
    """Contest reyting hisoblandi deb belgilaydi."""
    contest.rating_calculated = True
    contest.save(update_fields=['rating_calculated'])
```

---

## 4. CELERY TASK

### `apps/contests/tasks.py` — TO'LIQ QAYTA YOZ:

```python
from celery import shared_task
from celery.utils.log import get_task_logger
from django.utils import timezone

logger = get_task_logger(__name__)


@shared_task(
    bind       = True,
    max_retries = 3,
    default_retry_delay = 30,   # 30 soniya kutib qayta urish
    name       = 'contests.finalize_contest',
)
def finalize_contest(self, contest_id: int):
    """
    Contest tugagandan keyin:
    1. Status → finished
    2. Scoreboard muzlatishni ochish
    3. Reyting hisoblash (is_rated bo'lsa)
    
    Celery orqali chaqiriladi — HTTP zapros yo'q.
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
        if contest.is_frozen:
            contest.is_frozen = False
            contest.save(update_fields=['is_frozen'])
            logger.info('  ✅ Scoreboard muzlatishi ochildi')

        # ── Reyting hisoblash ─────────────────────
        if contest.is_rated and not contest.rating_calculated:
            logger.info('  📊 Reyting hisoblash boshlanadi...')

            from .scoring import run_rating_calculation
            result = run_rating_calculation(contest)

            if result['success']:
                count = result.get('count', 0)
                logger.info(
                    f'  ✅ Reyting hisoblandi: {count} ta ishtirokchi'
                )
            else:
                logger.error(
                    f'  ❌ Reyting xatosi: {result["error"]}'
                )
                # Qayta urish
                raise Exception(result['error'])
        else:
            if not contest.is_rated:
                logger.info('  ⏭ is_rated=False')

                # Rated bo'lmasa ham flagni qo'y
                if not contest.rating_calculated:
                    contest.rating_calculated = True
                    contest.save(
                        update_fields=['rating_calculated']
                    )
            else:
                logger.info('  ⏭ Allaqachon hisoblangan')

    except Exception as exc:
        logger.error(
            f'  ❌ finalize_contest xatosi: {exc}',
            exc_info=True,
        )
        # 30 soniyadan keyin qayta urinish
        raise self.retry(exc=exc)


@shared_task(name='contests.sync_statuses')
def sync_contest_statuses():
    """
    Har daqiqada chaqiriladi (Celery Beat).
    Barcha aktiv contestlar statusini tekshiradi.
    O'tib ketgan contestlarni finalize qiladi.
    """
    from .models import Contest

    now = timezone.now()

    # Tugagan lekin status yangilanmagan contestlar
    should_finish = Contest.objects.filter(
        status   = 'running',
        end_time__lte = now,
    )

    for contest in should_finish:
        logger.info(
            f'⏰ Contest #{contest.id} tugadi — '
            f'finalize_contest ishga tushirildi'
        )
        finalize_contest.delay(contest.id)

    # Boshlanishi kerak bo'lgan contestlar
    should_start = Contest.objects.filter(
        status     = 'upcoming',
        start_time__lte = now,
        end_time__gt    = now,
    )
    for contest in should_start:
        contest.status = 'running'
        contest.save(update_fields=['status'])
        logger.info(f'🟢 Contest #{contest.id} boshlandi')

    # Hisoblangan bo'lmagan o'tgan contestlar
    # (finalize_contest o'tkazib yuborilgan bo'lsa)
    missed = Contest.objects.filter(
        status            = 'finished',
        is_rated          = True,
        rating_calculated = False,
    )
    for contest in missed:
        logger.warning(
            f'⚠ Contest #{contest.id} — reyting '
            f'hisobllanmagan, qayta ishga tushirildi'
        )
        finalize_contest.delay(contest.id)
```

---

## 5. CELERY BEAT KONFIGURATSIYA

### `config/celery.py`:

```python
from celery.schedules import crontab

app.conf.beat_schedule = {
    # Har daqiqada contest statuslarini sinc qilish
    'sync-contest-statuses': {
        'task':     'contests.sync_statuses',
        'schedule': 60.0,   # 60 soniya
    },
}

app.conf.timezone = 'Asia/Tashkent'
```

### Celery Beat ishga tushirish:

```bash
# Worker (alohida terminal):
celery -A config worker --loglevel=info

# Beat scheduler (alohida terminal):
celery -A config beat --loglevel=info
```

---

## 6. API ENDPOINTS

### `apps/contests/views.py` ga qo'sh:

```python
class ContestRatingView(APIView):
    """
    GET /api/contests/:slug/rating/
    
    Contest reyting o'zgarishlarini qaytaradi.
    Frontend polling uchun ishlatadi.
    """
    permission_classes = [AllowAny]

    def get(self, request, slug):
        contest = get_object_or_404(Contest, slug=slug)

        if not contest.is_rated:
            return Response({
                'available': True,
                'is_rated':  False,
                'changes':   [],
            })

        if not contest.rating_calculated:
            return Response({
                'available': False,
                'is_rated':  True,
                'message':   'Hisoblash jarayonida...',
            })

        changes = RatingChange.objects.filter(
            contest=contest
        ).select_related('user').order_by('rank')

        # Joriy foydalanuvchi o'zgarishi
        my_change = None
        if request.user.is_authenticated:
            mine = changes.filter(user=request.user).first()
            if mine:
                my_change = {
                    'old_rating':    mine.old_rating,
                    'new_rating':    mine.new_rating,
                    'delta':         mine.delta,
                    'rank':          mine.rank,
                    'old_rank_title': mine.old_rank_title,
                    'new_rank_title': mine.new_rank_title,
                }

        return Response({
            'available': True,
            'is_rated':  True,
            'my_change': my_change,
            'changes': [{
                'username':      rc.user.username,
                'avatar_url':    getattr(rc.user, 'avatar_url', ''),
                'old_rating':    rc.old_rating,
                'new_rating':    rc.new_rating,
                'delta':         rc.delta,
                'rank':          rc.rank,
                'solved_count':  rc.solved_count,
                'old_rank_title': rc.old_rank_title,
                'new_rank_title': rc.new_rank_title,
            } for rc in changes],
        })


class AdminRecalculateRatingView(APIView):
    """
    POST /api/admin/contests/:slug/recalculate-rating/
    
    Admin uchun qo'lda qayta hisoblash.
    Agar contest "qotib qolsa" shu endpoint ishlatiladi.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, slug):
        from .tasks import finalize_contest
        from .models import Contest

        contest = get_object_or_404(Contest, slug=slug)

        # Reset
        contest.rating_calculated = False
        contest.save(update_fields=['rating_calculated'])

        RatingChange.objects.filter(contest=contest).delete()

        # Celery orqali qayta hisoblash
        finalize_contest.delay(contest.id)

        return Response({
            'success': True,
            'message': 'Reyting qayta hisoblash boshlandi. '
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

## 7. USER MODEL

### `apps/accounts/models.py` — tekshir va qo'sh:

```python
class User(AbstractUser):
    # ... mavjud fieldlar ...

    rating      = models.IntegerField(
        default = 0,
        help_text = 'Joriy Codeforces-style reyting'
    )
    max_rating  = models.IntegerField(
        default = 0,
        help_text = 'Eng yuqori reyting'
    )

    @property
    def rank_title(self):
        from apps.contests.rating_engine import get_rank_title
        return get_rank_title(self.rating)

    @property
    def rank_color(self):
        from apps.contests.rating_engine import get_rank_color
        return get_rank_color(self.rating)
```

---

## 8. TEKSHIRUV

```bash
# 1. Migration
python manage.py makemigrations
python manage.py migrate
python manage.py check   # xato yo'q

# 2. Celery ishga tushirish
# Terminal 1:
celery -A config worker --loglevel=info

# Terminal 3:
celery -A config beat --loglevel=info

# 3. Qo'lda sinab ko'rish
python manage.py shell
>>> from apps.contests.scoring import run_rating_calculation
>>> from apps.contests.models import Contest
>>> c = Contest.objects.get(id=1)
>>> result = run_rating_calculation(c)
>>> print(result)

# 4. Kutilayotgan Celery log:
# 🏁 finalize_contest #1
# ✅ Status → finished
# 📊 Reyting hisoblash boshlanadi...
# ── Reyting o'zgarishlari ──────────
#    1. mehmed_77           1200 → 1248 ( +48)
#    2. user_2               950 →  930 ( -20)
#    3. user_3               800 →  793 (  -7)
# ✅ Reyting hisoblandi: 3 ta ishtirokchi
```

---

## TEKSHIRUV RO'YXATI

```
Backend:
  ✅ RatingChange modeli mavjud
  ✅ User.rating va max_rating fieldlari mavjud
  ✅ rating_engine.py — sof Python, HTTP yo'q
  ✅ scoring.py — atomic transaction
  ✅ finalize_contest task — max_retries=3
  ✅ sync_contest_statuses — har daqiqada
  ✅ Celery Beat konfiguratsiya

Algoritm:
  ✅ Win probability: 1/(1+6^((b-a)/400))
  ✅ Expected rank hisoblash
  ✅ Mid rank (geometric mean)
  ✅ Binary search — seed reyting
  ✅ Muvozanat korreksiyasi
  ✅ 1-o'rin himoyasi (+1 minimum)
  ✅ Minimal reyting: 1 (manfiy bo'lmaydi)
  ✅ Rank darajalari: Newbie → Legendary GM

API:
  ✅ GET /api/contests/:slug/rating/ — polling
  ✅ POST /api/admin/.../recalculate-rating/

Frontend:
  ✅ Har 10s polling — available=True bo'lsa to'xtaydi
  ✅ 3 holat: running → calculating → done
  ✅ Reyting animatsiyasi va delta badge
```

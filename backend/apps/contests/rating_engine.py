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
  7. Minimal reyting: 1 (manfiy bo'lmaydi)
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
    left, right = 1, 10000
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

    # YANGI: kiruvchi ma'lumotni tartiblash
    # (scoring.py noto'g'ri tartibda yuborsa himoya)
    participants = sorted(
        participants,
        key=lambda p: (p['rank'], p.get('penalty', 0))
    )

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
    expected_ranks = []
    for i in range(n):
        p = participants[i]
        
        # Birinchi contest: rating=0 yoki is_first_contest=True
        if p['old_rating'] == 0 or p.get('is_first_contest', False):
            # Rasmiy Codeforces qoidasi
            expected = 1.0 + n / 2.0
        else:
            expected = _get_expected_rank(ratings, i)
            
        expected_ranks.append(expected)

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

    # ── 5. Muvozanat korreksiyasi (aniq zero-sum) ──────
    total = sum(deltas)
    if total != 0:
        # Har bir delta ga tuzatish
        # (manfiy tomonga — reyting saqlanadi)
        correction = -(total // n)
        # Faqat pasaytirish yo'nalishida
        correction = min(correction, 0)
        deltas = [d + correction for d in deltas]

        # Qolgan farqni eng katta olganlardan ajratish
        remainder = sum(deltas)
        if remainder > 0:
            # Eng ko'p olganlardan birer-birer olib
            # yig'indini nolga yaqinlashtirish
            sorted_idx = sorted(
                range(n), key=lambda x: -deltas[x]
            )
            for idx in sorted_idx:
                if remainder <= 0:
                    break
                deltas[idx] -= 1
                remainder   -= 1

    # ── 6. Natijalarni yig'ish ─────────────────────
    results = []
    for i, p in enumerate(participants):
        old_r = p['old_rating']
        
        # new_rating minimal 1 — delta emas!
        new_r = max(1, old_r + deltas[i])
        delta = new_r - old_r  # haqiqiy o'zgarish

        results.append({
            'user_id':        p['user_id'],
            'username':       p['username'],
            'old_rating':     old_r,
            'new_rating':     new_r,
            'delta':          delta,
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

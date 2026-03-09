"""
Leaderboard business logic.
Rating hisoblash va rank tizimi.
"""
import logging
from django.db.models import F
from .models import UserRating

logger = logging.getLogger(__name__)

# Rank unvonlari va ranglar
RANK_TITLES = [
    (2100, 'Master', '#FFD700'),          # Sariq (oltin)
    (1900, 'Candidate Master', '#AA00AA'),  # Binafsha
    (1600, 'Expert', '#0000FF'),            # Ko'k
    (1400, 'Specialist', '#03A89E'),        # Ko'k-yashil
    (1200, 'Pupil', '#008000'),             # Yashil
    (0,    'Newbie', '#808080'),             # Kulrang
]


def get_rank_title(rating):
    """
    Rating ga qarab unvon va rangni qaytaradi.

    Args:
        rating: int

    Returns:
        dict: {title, color}
    """
    for min_rating, title, color in RANK_TITLES:
        if rating >= min_rating:
            return {'title': title, 'color': color}
    return {'title': 'Newbie', 'color': '#808080'}


def recalculate_ranks():
    """
    Barcha foydalanuvchilarni rating bo'yicha tartiblaydi
    va rank ni yangilaydi.
    """
    ratings = UserRating.objects.order_by('-rating', 'user__username')

    rank = 0
    prev_rating = None
    updates = []

    for i, user_rating in enumerate(ratings):
        # Bir xil rating — bir xil rank
        if user_rating.rating != prev_rating:
            rank = i + 1
            prev_rating = user_rating.rating

        if user_rating.rank != rank:
            user_rating.rank = rank
            updates.append(user_rating)

    # Batch update
    if updates:
        UserRating.objects.bulk_update(updates, ['rank'])
        logger.info(f"{len(updates)} ta foydalanuvchi ranki yangilandi")


def update_rating_after_contest(contest):
    """
    Rated kontest tugagandan keyin rating ni yangilash.
    Soddalashtirilgan ELO-ga o'xshash formula.

    Args:
        contest: Contest model instance
    """
    from apps.contests.models import ContestParticipant

    if not contest.is_rated:
        return

    participants = ContestParticipant.objects.filter(
        contest=contest,
    ).select_related('user').order_by('-score', 'penalty')

    total = participants.count()
    if total == 0:
        return

    for i, participant in enumerate(participants):
        # UserRating ni olish yoki yaratish
        user_rating, created = UserRating.objects.get_or_create(
            user=participant.user,
        )

        # Soddalashtirilgan reyting o'zgarishi
        # Yuqori o'rinlar ko'proq ball oladi
        position = i + 1
        expected_position = total / 2  # O'rtacha joy

        # K-factor (yangi foydalanuvchilar uchun kattaroq)
        if user_rating.rating < 1400:
            k_factor = 40
        elif user_rating.rating < 1900:
            k_factor = 30
        else:
            k_factor = 20

        # Rating o'zgarishi
        if participant.score > 0:
            performance = (expected_position - position) / total
            delta = int(k_factor * performance)
            # Minimum -30, maximum +100
            delta = max(-30, min(100, delta))
        else:
            # Hech narsa yechmagan — penalty
            delta = -10

        user_rating.rating = max(0, user_rating.rating + delta)
        user_rating.save()

        # User modelidagi rating ni ham yangilash
        participant.user.rating = user_rating.rating
        participant.user.save(update_fields=['rating'])

    # Barcha ranklarni qayta hisoblash
    recalculate_ranks()
    logger.info(f"Kontest '{contest.title}' uchun ratinglar yangilandi ({total} ishtirokchi)")

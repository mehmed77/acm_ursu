"""
Contest tugagandan keyin scoreboard va
reyting hisoblash.
"""
import logging
from django.db   import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


def calculate_minutes_from_start(contest, submission_time, registration=None):
    """
    Submission yuborilgan vaqtni contest boshidan minutlarda hisoblaydi.
    Virtual qatnashuvchilarni hisobga oladi.
    """
    if registration and registration.is_virtual and registration.virtual_start:
        start_time = registration.virtual_start
    else:
        start_time = contest.start_time

    delta = submission_time - start_time
    return max(0, int(delta.total_seconds() / 60))


# ─────────────────────────────────────────────────────────
# KRITIK FIX 1: Scoreboard rank hisoblash (tie bilan)
# ─────────────────────────────────────────────────────────

def recalculate_scoreboard(contest) -> None:
    """
    ICPC va Codeforces ball tizimini qo'llab-quvvatlaydi.
    Reyting hisoblashdan OLDIN chaqirilishi shart.
    """
    from .models import ScoreboardEntry, ContestProblem, ContestSubmission
    from apps.submissions.models import Submission

    # 1. Barcha registratsiyalarni olish
    from .models import ContestRegistration
    registrations = list(ContestRegistration.objects.filter(contest=contest, is_virtual=False).select_related('user', 'team'))
    
    # 2. Scoreboard yozuvlarini tekshirish/yaratish/yangilash
    for reg in registrations:
        entry, created = ScoreboardEntry.objects.get_or_create(
            contest=contest,
            user=reg.user,
            is_virtual=False
        )
        # Jamoani yangilash (agar jamoaga qo'shilgan yoki chiqqan bo'lsa)
        if entry.team != reg.team:
            entry.team = reg.team
            entry.save(update_fields=['team'])

    # 3. Yangi ro'yxatni olish
    entries = list(
        ScoreboardEntry.objects.filter(
            contest    = contest,
            is_virtual = False,
        ).select_related('user', 'team')
    )

    if not entries:
        return

    contest_problems = list(
        c.contest_problems.select_related('problem').order_by('order')
        for c in [contest]
    )[0]

    is_scored = any(cp.get_max_score() > 0 for cp in contest_problems)

    # 4. Jamoalar natijalarini keshlab olamiz
    team_results = {}
    
    for entry in entries:
        # Agar jamoaga tegishli bo'lsa va bu jamoa hali hisoblanmagan bo'lsa
        if entry.team and entry.team_id not in team_results:
            t_score, t_solved, t_penalty, t_last_ac = 0, 0, 0, 0
            t_results, t_scores = {}, {}

            for cp in contest_problems:
                c_subs = ContestSubmission.objects.filter(contest=contest, contest_problem=cp, team=entry.team)
                subs = Submission.objects.filter(id__in=c_subs.values_list('submission_id', flat=True)).order_by('created_at')
                
                first_ac, wrong_count, frozen_count = None, 0, 0
                for s in subs:
                    qs = c_subs.filter(submission=s).first()
                    minutes = qs.minutes_from_start if qs else 0
                    is_frozen = contest.freeze_time and s.created_at >= contest.freeze_time
                    
                    if s.status == Submission.Status.ACCEPTED:
                        if not first_ac: first_ac = s
                    elif s.status in [Submission.Status.WRONG_ANSWER, Submission.Status.TIME_LIMIT_EXCEEDED, 
                                    Submission.Status.MEMORY_LIMIT_EXCEEDED, Submission.Status.RUNTIME_ERROR]:
                        if not first_ac:
                            if is_frozen: frozen_count += 1
                            else: wrong_count += 1
                
                res = {'solved': False, 'attempts': wrong_count, 'time': 0, 'frozen_attempts': frozen_count}
                if first_ac:
                    qs_ac = c_subs.filter(submission=first_ac).first()
                    ac_m = qs_ac.minutes_from_start if qs_ac else 0
                    res.update({'solved': True, 'attempts': wrong_count + 1, 'time': ac_m})
                    t_solved += 1
                    t_penalty += ac_m + (wrong_count * 20)
                    t_last_ac = max(t_last_ac, ac_m)
                    if is_scored:
                        sc = cp.problem.calculate_score(minutes_elapsed=ac_m, wrong_attempts=wrong_count)
                        t_score += sc
                        t_scores[cp.label] = {'score': sc, 'time': ac_m, 'attempts': wrong_count + 1}
                t_results[cp.label] = res
            
            team_results[entry.team_id] = {
                'solved': t_solved, 'penalty': t_penalty, 'last_ac': t_last_ac,
                'results': t_results, 'score': t_score, 'scores': t_scores
            }

    # 5. Har bir entryni o'ziga xos natijalari bilan to'ldiramiz
    for entry in entries:
        if entry.team:
            res = team_results.get(entry.team_id)
            entry.solved_count = res['solved']
            entry.penalty = res['penalty']
            entry.last_accept_time = res['last_ac']
            entry.problem_results = res['results']
            if is_scored:
                entry.total_score = res['score']
                entry.problem_scores = res['scores']
        else:
            # Individual ishtirokchi
            ind_score, ind_solved, ind_penalty, ind_last_ac = 0, 0, 0, 0
            ind_results, ind_scores = {}, {}

            for cp in contest_problems:
                c_subs = ContestSubmission.objects.filter(contest=contest, contest_problem=cp, user=entry.user, team__isnull=True)
                subs = Submission.objects.filter(id__in=c_subs.values_list('submission_id', flat=True)).order_by('created_at')
                
                f_ac, w_c, f_c = None, 0, 0
                for s in subs:
                    if s.status == Submission.Status.ACCEPTED:
                        if not f_ac: f_ac = s
                    elif s.status in [Submission.Status.WRONG_ANSWER, Submission.Status.TIME_LIMIT_EXCEEDED, 
                                    Submission.Status.MEMORY_LIMIT_EXCEEDED, Submission.Status.RUNTIME_ERROR]:
                        if not f_ac:
                            if contest.freeze_time and s.created_at >= contest.freeze_time: f_c += 1
                            else: w_c += 1
                
                res = {'solved': False, 'attempts': w_c, 'time': 0, 'frozen_attempts': f_c}
                if f_ac:
                    qs_ac = c_subs.filter(submission=f_ac).first()
                    ac_m = qs_ac.minutes_from_start if qs_ac else 0
                    res.update({'solved': True, 'attempts': w_c + 1, 'time': ac_m})
                    ind_solved += 1
                    ind_penalty += ac_m + (w_c * 20)
                    ind_last_ac = max(ind_last_ac, ac_m)
                    if is_scored:
                        sc = cp.problem.calculate_score(minutes_elapsed=ac_m, wrong_attempts=w_c)
                        ind_score += sc
                        ind_scores[cp.label] = {'score': sc, 'time': ac_m, 'attempts': w_c + 1}
                ind_results[cp.label] = res

            entry.solved_count = ind_solved
            entry.penalty = ind_penalty
            entry.last_accept_time = ind_last_ac
            entry.problem_results = ind_results
            if is_scored:
                entry.total_score = ind_score
                entry.problem_scores = ind_scores

    # Tartiblash
    if is_scored:
        sorted_entries = sorted(
            entries,
            key=lambda e: (-(e.total_score or 0), e.penalty or 0)
        )
    else:
        sorted_entries = sorted(
            entries,
            key=lambda e: (-(e.solved_count or 0), e.penalty or 0)
        )

    # Rank berish (tie bilan)
    rank = 1
    to_update = []
    for i, entry in enumerate(sorted_entries):
        if i > 0:
            prev = sorted_entries[i - 1]
            if is_scored:
                is_tie = (entry.total_score == prev.total_score and entry.penalty == prev.penalty)
            else:
                is_tie = (entry.solved_count == prev.solved_count and entry.penalty == prev.penalty)
            if not is_tie:
                rank = i + 1

        entry.rank = rank
        to_update.append(entry)

    # Bulk update
    ScoreboardEntry.objects.bulk_update(
        to_update, 
        ['rank', 'solved_count', 'penalty', 'last_accept_time', 'problem_results', 'total_score', 'problem_scores']
    )

    logger.info(
        f'  📊 Scoreboard yangilandi: '
        f'{len(entries)} ta ishtirokchi'
    )


# Backward compatibility alias
calculate_scoreboard = recalculate_scoreboard


# ─────────────────────────────────────────────────────────
# ASOSIY FUNKSIYA
# ─────────────────────────────────────────────────────────

def run_rating_calculation(contest) -> dict:
    """"
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
        'user_id':          entry.user.id,
        'username':         entry.user.username,
        'old_rating':       getattr(entry.user, 'rating', 0) or 0,
        'rank':             entry.rank or 1,
        'solved':           entry.solved_count or 0,
        'penalty':          entry.penalty or 0,
        # YANGI: birinchi contest tekshiruvi
        'is_first_contest': (
            not RatingChange.objects.filter(
                user=entry.user
            ).exists()
        ),
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

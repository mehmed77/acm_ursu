"""
Contest API Views.
"""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from .models import (
    Contest, ContestProblem, Team, TeamMember,
    ContestRegistration, ContestSubmission,
    ScoreboardEntry, RatingChange,
)
from .scoring import calculate_minutes_from_start


def make_aware_dt(val):
    """Matnni timezone-aware datetime obyektiga o'tkazish"""
    if not val:
        return None
    from django.utils.dateparse import parse_datetime
    if isinstance(val, str):
        dt = parse_datetime(val)
        if dt and timezone.is_naive(dt):
            return timezone.make_aware(dt)
        return dt
    return val


def contest_to_dict(c, user=None):
    """Contest obyektini dict ga aylantirish."""
    reg = None
    if user and user.is_authenticated:
        reg = ContestRegistration.objects.filter(
            contest=c, user=user
        ).first()
    return {
        'id':           c.id,
        'title':        c.title,
        'slug':         c.slug,
        'contest_type': c.contest_type,
        'status':       c.status,
        'start_time':   c.start_time.isoformat(),
        'end_time':     c.end_time.isoformat(),
        'freeze_time':  c.freeze_time.isoformat() if c.freeze_time else None,
        'duration_min': c.duration_minutes,
        'is_team':      c.is_team_contest,
        'max_team_size': c.max_team_size,
        'is_rated':     c.is_rated,
        'is_virtual_allowed': c.is_virtual_allowed,
        'problem_count': c.contest_problems.count(),
        'reg_count':    c.registrations.count(),
        'registered':   reg is not None,
        'is_virtual':   reg.is_virtual if reg else False,
        'created_at':   c.created_at.isoformat() if c.created_at else None,
    }


# ─── Contest List ──────────────────────────

class ContestListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        qs = Contest.objects.filter(is_public=True).exclude(status='draft')

        st = request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)

        result = []
        for c in qs:
            c.sync_status()
            result.append(contest_to_dict(c, request.user))
        return Response(result)


# ─── Contest Detail ──────────────────────────

class ContestDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        c = get_object_or_404(Contest, slug=slug, is_public=True)
        c.sync_status()

        reg = None
        if request.user.is_authenticated:
            reg = ContestRegistration.objects.filter(
                contest=c, user=request.user
            ).first()

        # Masalalar faqat ruxsat bo'lganda
        can_see = (
            c.status in ['running', 'frozen', 'finished'] and reg is not None
        ) or (request.user.is_authenticated and request.user.is_staff)

        problems = []
        if can_see:
            for cp in c.contest_problems.select_related('problem').order_by('order'):
                p = cp.problem
                # Sample test cases
                samples = []
                for tc in p.test_cases.filter(is_sample=True).order_by('file_number', 'id'):
                    samples.append({
                        'input':  tc.input_data,
                        'output': tc.expected_output,
                    })

                problems.append({
                    'label':         cp.label,
                    'slug':          p.slug,
                    'title':         p.title,
                    'time_limit':    p.time_limit,
                    'memory_limit':  p.memory_limit,
                    'description':   p.description,
                    'input_format':  p.input_format,
                    'output_format': p.output_format,
                    'samples':       samples,
                })

        # User scoreboard entry
        user_entry = None
        if request.user.is_authenticated and reg:
            if reg.team:
                entry = ScoreboardEntry.objects.filter(
                    contest=c, team=reg.team, is_virtual=reg.is_virtual
                ).first()
            else:
                entry = ScoreboardEntry.objects.filter(
                    contest=c, user=request.user, is_virtual=reg.is_virtual
                ).first()
                
            if entry:
                user_entry = {
                    'rank':            entry.rank,
                    'solved':          entry.solved_count,
                    'penalty':         entry.penalty,
                    'problem_results': entry.problem_results,
                }
            else:
                # Default empty entry for registered users
                user_entry = {
                    'rank':            '—',
                    'solved':          0,
                    'penalty':         0,
                    'problem_results': {},
                }

        # Team info
        team_info = None
        if reg and reg.team:
            members = TeamMember.objects.filter(
                team=reg.team
            ).select_related('user')
            team_info = {
                'id':          reg.team.id,
                'name':        reg.team.name,
                'invite_code': reg.team.invite_code,
                'members': [{
                    'username': m.user.username,
                    'role':     m.role,
                } for m in members],
            }

        data = contest_to_dict(c, request.user)
        data.update({
            'description':  c.description,
            'problems':     problems,
            'user_entry':   user_entry,
            'team':         team_info,
        })
        return Response(data)


# ─── Register ───────────────────────────

class ContestRegisterView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        c = get_object_or_404(Contest, slug=slug)
        c.sync_status()

        is_virtual = request.data.get('is_virtual', False)

        if is_virtual:
            if not c.is_virtual_allowed:
                return Response({'detail': 'Virtual ruxsat etilmagan'}, status=400)
            if c.status != 'finished':
                return Response({'detail': 'Virtual faqat tugagan contest uchun'}, status=400)
        else:
            if c.status == 'finished':
                return Response({'detail': 'Contest tugagan'}, status=400)

        if ContestRegistration.objects.filter(contest=c, user=request.user).exists():
            return Response({'detail': "Allaqachon ro'yxatdan o'tgansiz"}, status=400)

        virtual_start = timezone.now() if is_virtual else None

        ContestRegistration.objects.create(
            contest       = c,
            user          = request.user,
            is_virtual    = is_virtual,
            virtual_start = virtual_start,
        )

        return Response({'success': True, 'is_virtual': is_virtual})


# ─── Team Create ─────────────────────────

class TeamCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        c = get_object_or_404(Contest, slug=slug)

        if not c.is_team_contest:
            return Response({'detail': 'Bu contest team contest emas'}, status=400)

        reg = ContestRegistration.objects.filter(contest=c, user=request.user).first()
        if not reg:
            return Response({'detail': "Avval ro'yxatdan o'ting"}, status=400)
        if reg.team:
            return Response({'detail': 'Allaqachon teamdasiz'}, status=400)

        name = request.data.get('name', '').strip()
        if not name:
            return Response({'detail': 'Team nomi kiritilishi shart'}, status=400)
        if Team.objects.filter(contest=c, name=name).exists():
            return Response({'detail': 'Bu nom band'}, status=400)

        team = Team.objects.create(contest=c, name=name, leader=request.user)
        TeamMember.objects.create(team=team, user=request.user, role='leader')
        reg.team = team
        reg.save(update_fields=['team'])

        # Retrospective sync: Old submissions to team
        params = {'contest': c, 'user': request.user, 'team__isnull': True}
        ContestSubmission.objects.filter(**params).update(team=team)
        
        # Individual scoreboardni o'chirish (team scoreboard bilan almashadi)
        ScoreboardEntry.objects.filter(contest=c, user=request.user, is_virtual=reg.is_virtual).delete()

        # Scoreboardni yangilash (memberlar uchun)
        from .scoring import recalculate_scoreboard
        recalculate_scoreboard(c)

        return Response({
            'id':          team.id,
            'name':        team.name,
            'invite_code': team.invite_code,
        })


# ─── Team Join ─────────────────────────

class TeamJoinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        c = get_object_or_404(Contest, slug=slug)

        invite_code = request.data.get('invite_code', '').strip().upper()
        team = get_object_or_404(Team, contest=c, invite_code=invite_code)

        if team.team_members.count() >= c.max_team_size:
            return Response(
                {'detail': f"Team to'lgan (max {c.max_team_size} kishi)"},
                status=400
            )

        reg = ContestRegistration.objects.filter(contest=c, user=request.user).first()
        if not reg:
            return Response({'detail': "Avval ro'yxatdan o'ting"}, status=400)
        if reg.team:
            return Response({'detail': 'Allaqachon teamdasiz'}, status=400)

        TeamMember.objects.create(team=team, user=request.user, role='member')
        reg.team = team
        reg.save(update_fields=['team'])

        # Retrospective sync
        params = {'contest': c, 'user': request.user, 'team__isnull': True}
        ContestSubmission.objects.filter(**params).update(team=team)
        
        # Individual scoreboardni o'chirish
        ScoreboardEntry.objects.filter(contest=c, user=request.user, is_virtual=reg.is_virtual).delete()

        # Scoreboardni yangilash
        from .scoring import recalculate_scoreboard
        recalculate_scoreboard(c)

        return Response({'success': True, 'team': {'id': team.id, 'name': team.name}})


# ─── Contest Submit ──────────────────────

class ContestSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, slug, label):
        c = get_object_or_404(Contest, slug=slug)

        reg = ContestRegistration.objects.filter(contest=c, user=request.user).first()
        if not reg:
            return Response({'detail': "Ro'yxatdan o'tmadingiz"}, status=403)

        now = timezone.now()

        if reg.is_virtual:
            if not reg.virtual_start:
                return Response({'detail': 'Virtual boshlanmagan'}, status=400)
            elapsed = (now - reg.virtual_start).total_seconds() / 60
            if elapsed > c.duration_minutes:
                return Response({'detail': 'Virtual vaqtingiz tugadi'}, status=400)
        else:
            c.sync_status()
            if c.status not in ['running', 'frozen']:
                return Response({'detail': "Contest hozir o'tmayapti"}, status=400)

        cp = get_object_or_404(ContestProblem, contest=c, label=label.upper())

        code     = request.data.get('code', '')
        language = request.data.get('language', '')

        if not code or not language:
            return Response({'detail': 'Kod va til kiritilishi shart'}, status=400)

        from apps.submissions.models import Submission
        submission = Submission.objects.create(
            user     = request.user,
            problem  = cp.problem,
            code     = code,
            language = language,
            status   = 'pending',
            run_type = 'submit',
        )

        mins = calculate_minutes_from_start(c, submission.created_at, reg)

        ContestSubmission.objects.create(
            contest            = c,
            submission         = submission,
            user               = request.user,
            team               = reg.team,
            problem            = cp.problem,
            contest_problem    = cp,
            is_virtual         = reg.is_virtual,
            minutes_from_start = mins,
        )

        from apps.submissions.tasks import run_submission
        run_submission.delay(submission.id)

        return Response({
            'submission_id': submission.id,
            'status':        'pending',
            'minutes':       mins,
        })


# ─── Contest Submission History ────────────

class MyContestSubmissionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        c = get_object_or_404(Contest, slug=slug)
        reg = ContestRegistration.objects.filter(contest=c, user=request.user).first()
        
        subs_qs = ContestSubmission.objects.filter(contest=c)
        if reg and reg.team:
            subs_qs = subs_qs.filter(team=reg.team)
        else:
            subs_qs = subs_qs.filter(user=request.user)

        subs = subs_qs.select_related(
            'submission', 'contest_problem', 'problem'
        ).order_by('-submission__created_at')[:20]

        return Response([{
            'id':            s.submission.id,
            'label':         s.contest_problem.label,
            'problem_title': s.problem.title,
            'status':        s.submission.status,
            'time_used':     s.submission.time_used or 0,
            'memory_used':   s.submission.memory_used or 0,
            'language':      s.submission.language,
            'minutes':       s.minutes_from_start,
            'created_at':    s.submission.created_at.isoformat(),
        } for s in subs])


# ─── Scoreboard ──────────────────────────

class ContestScoreboardView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        c = get_object_or_404(Contest, slug=slug)
        c.sync_status()

        problems = list(
            c.contest_problems.select_related('problem').order_by('order')
        )
        labels = [cp.label for cp in problems]
        titles = {cp.label: cp.problem.title for cp in problems}

        is_admin = request.user.is_authenticated and request.user.is_staff
        show_frozen = c.status == 'frozen' and not is_admin

        entries = ScoreboardEntry.objects.filter(
            contest=c, is_virtual=False
        ).select_related('user', 'team').order_by('rank')

        freeze_min = 0
        if show_frozen and c.freeze_time:
            delta = c.freeze_time - c.start_time
            freeze_min = int(delta.total_seconds() / 60)

        board = []
        for e in entries:
            prob_results = dict(e.problem_results)

            if show_frozen:
                for lbl, pr in prob_results.items():
                    is_post_freeze_solved = pr.get('solved') and pr.get('time', 0) >= freeze_min
                    has_frozen_attempts = pr.get('frozen_attempts', 0) > 0
                    if is_post_freeze_solved or has_frozen_attempts:
                        prob_results[lbl] = {**pr, 'solved': False, 'frozen': True, 'time': 0}

            board.append({
                'rank':     e.rank,
                'username': e.user.username if e.user else '—',
                'team':     e.team.name if e.team else None,
                'solved':   e.solved_count,
                'penalty':  e.penalty,
                'problems': prob_results,
                'last_ac':  e.last_accept_time,
            })

        # Virtual entries
        virtual_board = []
        virtual_entries = ScoreboardEntry.objects.filter(
            contest=c, is_virtual=True
        ).select_related('user').order_by('-solved_count', 'penalty')
        for e in virtual_entries:
            virtual_board.append({
                'username': e.user.username if e.user else '—',
                'solved':   e.solved_count,
                'penalty':  e.penalty,
                'problems': e.problem_results,
            })

        return Response({
            'contest': {
                'title':       c.title,
                'status':      c.status,
                'is_frozen':   show_frozen,
                'end_time':    c.end_time.isoformat(),
                'freeze_time': c.freeze_time.isoformat() if c.freeze_time else None,
            },
            'problems':       labels,
            'problem_titles': titles,
            'scoreboard':     board,
            'virtual':        virtual_board,
            'updated_at':     timezone.now().isoformat(),
        })


# ─── Rating Changes ──────────────────────

class ContestRatingView(APIView):
    """
    GET /api/contests/:slug/rating/
    Frontend polling uchun.
    """
    permission_classes = [AllowAny]

    def get(self, request, slug):
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


# ─── Admin Views ─────────────────────────

class AdminContestListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        contests = Contest.objects.all().order_by('-start_time')
        return Response([contest_to_dict(c) for c in contests])

    def post(self, request):
        data = request.data.copy()
        problems_data = data.pop('problems', [])

        c = Contest(
            title        = data['title'],
            description  = data.get('description', ''),
            contest_type = data.get('contest_type', 'icpc'),
            status       = data.get('status', 'upcoming'),
            start_time   = make_aware_dt(data['start_time']),
            end_time     = make_aware_dt(data['end_time']),
            freeze_time  = make_aware_dt(data.get('freeze_time')),
            is_team_contest    = data.get('is_team_contest', False),
            max_team_size      = data.get('max_team_size', 3),
            is_rated           = data.get('is_rated', True),
            is_public          = data.get('is_public', True),
            is_virtual_allowed = data.get('is_virtual_allowed', True),
            created_by   = request.user,
        )
        c.save()

        # Problemlarni qoshish
        c.save()
        for i, p in enumerate(problems_data):
            pid = p.get('problem_id', p.get('id'))
            ContestProblem.objects.create(
                contest    = c,
                problem_id = pid,
                order      = i,
                label      = p.get('label', chr(ord('A') + i)),
                max_score  = p.get('max_score'),
            )
            # Problem modelini yangilaymiz (wrong_penalty uchun)
            if 'wrong_penalty' in p:
                from apps.problems.models import Problem
                prob = Problem.objects.filter(id=pid).first()
                if prob:
                    prob.wrong_penalty = p['wrong_penalty']
                    prob.save(update_fields=['wrong_penalty'])

        return Response(contest_to_dict(c), status=201)


class AdminContestDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, slug):
        c = get_object_or_404(Contest, slug=slug)
        data = contest_to_dict(c)
        data['description'] = c.description
        data['problems'] = [{
            'label': cp.label,
            'id':    cp.problem.id,
            'slug':  cp.problem.slug,
            'title': cp.problem.title,
            'order': cp.order,
            'score': cp.max_score,         
            'wrong_penalty': cp.problem.wrong_penalty,
            'difficulty': cp.problem.get_difficulty_display(),
        } for cp in c.contest_problems.select_related('problem').order_by('order')]
        return Response(data)

    def patch(self, request, slug):
        c = get_object_or_404(Contest, slug=slug)
        data = request.data.copy()
        problems_data = data.pop('problems', None)

        fields = [
            'title', 'description', 'contest_type', 'status',
            'start_time', 'end_time', 'freeze_time',
            'is_team_contest', 'max_team_size',
            'is_rated', 'is_public', 'is_virtual_allowed',
        ]
        for f in fields:
            if f in data:
                val = data[f]
                if f in ['start_time', 'end_time', 'freeze_time']:
                    val = make_aware_dt(val)
                setattr(c, f, val)
        c.save()

        if problems_data is not None:
            c.contest_problems.all().delete()
            for i, p in enumerate(problems_data):
                pid = p.get('problem_id', p.get('id'))
                ContestProblem.objects.create(
                    contest    = c,
                    problem_id = pid,
                    order      = i,
                    label      = p.get('label', chr(ord('A') + i)),
                    max_score  = p.get('max_score'),
                )
                if 'wrong_penalty' in p:
                    from apps.problems.models import Problem
                    prob = Problem.objects.filter(id=pid).first()
                    if prob:
                        prob.wrong_penalty = p['wrong_penalty']
                        prob.save(update_fields=['wrong_penalty'])

        return Response(contest_to_dict(c))

    def delete(self, request, slug):
        c = get_object_or_404(Contest, slug=slug)
        c.delete()
        return Response(status=204)


class AdminRecalculateRatingView(APIView):
    """
    POST /api/admin/contests/:slug/recalculate-rating/
    Admin uchun qo'lda qayta hisoblash.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, slug):
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

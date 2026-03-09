import uuid
import threading

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import Submission
from .serializers import (
    SubmissionCreateSerializer,
    SubmissionResultSerializer,
    SubmissionListSerializer,
    SubmissionCodeSerializer,
)


class RunCodeView(APIView):
    """
    POST /api/problems/:slug/run/

    Faqat namuna testlarda sinab ko'rish.
    - DB ga HECH NARSA yozmaydi
    - Celery ishlatmaydi
    - run_code_sync() ni to'g'ridan-to'g'ri chaqiradi
    - Windows + Linux ikkalasida ishlaydi (threading timeout)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        from apps.problems.models import Problem
        from apps.submissions.judge_engine import run_code_sync
        from django.core.cache import cache

        problem  = get_object_or_404(Problem, slug=slug)
        code     = request.data.get('code', '').strip()
        language = request.data.get('language', 'python').strip()

        if not code or not language:
            return Response(
                {'error_message': 'Kod va til kiritilishi shart', 'status': 'SYSTEM_ERROR'},
                status=400,
            )

        sample_tests = list(problem.test_cases.filter(is_sample=True))
        if not sample_tests:
            sample_tests = list(problem.test_cases.all()[:3])

        # ── Windows + Linux compatible timeout ──
        result_box    = {}
        exception_box = {}

        def _run():
            try:
                result_box['data'] = run_code_sync(
                    code=code,
                    language=language,
                    test_cases=sample_tests,
                    time_limit=float(problem.time_limit),
                    memory_limit=problem.memory_limit,
                )
            except Exception as exc:
                exception_box['error'] = str(exc)

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()
        thread.join(timeout=35)  # 35 soniya kutadi

        # ── Natijani olish ──
        if thread.is_alive():
            result = {
                'status': 'SYSTEM_ERROR',
                'test_results': [],
                'error_message': (
                    'Judge container 35 soniyada javob bermadi. '
                    'Tekshiring: docker compose logs judge --tail=30'
                ),
            }
        elif 'error' in exception_box:
            result = {
                'status': 'SYSTEM_ERROR',
                'test_results': [],
                'error_message': exception_box['error'],
            }
        else:
            result = result_box.get('data', {
                'status': 'SYSTEM_ERROR',
                'test_results': [],
                'error_message': "Noma'lum xato",
            })

        # Frontend polling uchun cache ga yozamiz
        task_id = str(uuid.uuid4())
        result['id']          = task_id
        result['is_sync_run'] = True
        cache.set(f'run_task_{task_id}', result, timeout=600)

        return Response(result, status=200)


class RunTaskDetailView(generics.RetrieveAPIView):
    """GET /api/submissions/run_status/{task_id}/ — Polling uchun, cache dan oladi."""
    permission_classes = [AllowAny]

    def get(self, request, task_id, *args, **kwargs):
        from django.core.cache import cache

        data = cache.get(f'run_task_{task_id}')
        if data:
            return Response(data)
        return Response(
            {'status': 'SYSTEM_ERROR', 'error_message': 'Run task topilmadi yoki vaqti tugagan'},
            status=404,
        )


class SubmissionCreateView(generics.CreateAPIView):
    """
    POST /api/submissions/
    Faqat 'submit' (fayl tests) uchun.
    DB ga yozadi va Celery ga yuboradi.
    """
    serializer_class   = SubmissionCreateSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        from apps.submissions.judge_engine import check_code_safety, judge_submission_task

        code     = request.data.get('code', '')
        language = request.data.get('language', 'python')

        is_safe, reason = check_code_safety(code, language)
        if not is_safe:
            return Response({'error': reason}, status=400)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        submission = serializer.save(run_type='submit', status='pending')

        # Async — natijani kutmaymiz
        judge_submission_task.delay(submission.id)

        return Response(
            {'id': submission.id, 'status': 'pending'},
            status=status.HTTP_201_CREATED,
        )


class GlobalSubmissionsView(APIView):
    """GET /api/status/ — Barcha foydalanuvchilarning so'nggi submissionlari."""
    permission_classes = [AllowAny]

    def get(self, request):
        page     = int(request.query_params.get('page', 1))
        per_page = 30
        offset   = (page - 1) * per_page

        username  = request.query_params.get('username', '')
        prob_slug = request.query_params.get('problem', '')
        language  = request.query_params.get('language', '')
        sts       = request.query_params.get('status', '')

        qs = (
            Submission.objects
            .filter(run_type='submit')
            .select_related('user', 'problem')
            .order_by('-created_at')
        )

        if username:
            qs = qs.filter(user__username__icontains=username)
        if prob_slug:
            qs = qs.filter(problem__slug__icontains=prob_slug)
        if language:
            qs = qs.filter(language=language)
        if sts:
            qs = qs.filter(status=sts)

        total = qs.count()
        subs  = qs[offset: offset + per_page]

        data = [
            {
                'id':            s.id,
                'username':      s.user.username,
                'problem_slug':  s.problem.slug,
                'problem_title': s.problem.title,
                'language':      s.language,
                'status':        s.status,
                'time_used':     s.time_used   or 0,
                'memory_used':   s.memory_used or 0,
                'created_at':    s.created_at.isoformat(),
            }
            for s in subs
        ]

        return Response({
            'results':     data,
            'count':       total,
            'page':        page,
            'total_pages': (total + per_page - 1) // per_page,
        })


class SubmissionDetailView(generics.RetrieveAPIView):
    """GET /api/submissions/{id}/ — Polling uchun."""
    serializer_class   = SubmissionResultSerializer
    permission_classes = [AllowAny]
    queryset           = Submission.objects.select_related('user', 'problem')


class SubmissionCodeView(generics.RetrieveAPIView):
    """GET /api/submissions/{id}/code/ — Faqat o'z submissionini ko'radi."""
    serializer_class   = SubmissionCodeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Submission.objects.filter(
            user=self.request.user,
        ).select_related('problem', 'user')


class ProblemSubmissionsView(generics.ListAPIView):
    """GET /api/problems/{slug}/submissions/ — Shu masaladagi submissionlar."""
    serializer_class   = SubmissionListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Submission.objects
            .filter(
                user=self.request.user,
                problem__slug=self.kwargs['slug'],
                run_type='submit',
            )
            .select_related('user', 'problem')
            .order_by('-created_at')
        )


class MySubmissionsView(generics.ListAPIView):
    """GET /api/submissions/my/ — Barcha o'z submissionlari."""
    serializer_class   = SubmissionListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Submission.objects
            .filter(user=self.request.user)
            .select_related('user', 'problem')
            .order_by('-created_at')[:50]
        )
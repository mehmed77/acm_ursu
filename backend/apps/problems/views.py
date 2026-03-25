from rest_framework import generics, filters
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, F, Avg
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import get_object_or_404
import os, zipfile, io, glob
import logging
from django.conf import settings

from .models import Problem, TestCase, Tag, ProblemComment, CommentLike, ProblemRating
from .serializers import (
    ProblemListSerializer, ProblemDetailSerializer,
    AdminProblemListSerializer, AdminProblemDetailSerializer,
    AdminTestCaseSerializer, TagSerializer,
    ProblemCommentSerializer, ProblemCommentWriteSerializer,
    ProblemRatingStatsSerializer, ProblemRatingWriteSerializer,
)

logger = logging.getLogger(__name__)

def get_testcases_dir(slug):
    """testcases/{slug}/ papkasining to'liq yo'li."""
    return os.path.join(settings.BASE_DIR, 'testcases', slug)

def get_next_file_number(base_dir):
    """
    Papkadagi eng katta .in fayl raqamini topib +1 qaytaradi.
    Bo'sh papkada 1 qaytaradi.
    """
    if not os.path.exists(base_dir):
        return 1
    in_files = glob.glob(os.path.join(base_dir, '*.in'))
    if not in_files:
        return 1
    nums = []
    for f in in_files:
        name = os.path.basename(f).replace('.in', '')
        if name.isdigit():
            nums.append(int(name))
    return max(nums) + 1 if nums else 1

def write_test_file(base_dir, file_number, input_data, output_data):
    """Test fayllarini diskka yozadi."""
    os.makedirs(base_dir, exist_ok=True)
    in_path  = os.path.join(base_dir, f'{file_number}.in')
    out_path = os.path.join(base_dir, f'{file_number}.out')
    with open(in_path,  'w', encoding='utf-8') as f:
        f.write(input_data.strip() + '\n')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(output_data.strip() + '\n')
    return in_path, out_path

def delete_test_file(base_dir, file_number):
    """Test fayllarini diskdan o'chiradi."""
    for ext in ('.in', '.out'):
        path = os.path.join(base_dir, f'{file_number}{ext}')
        if os.path.exists(path):
            os.remove(path)


ADMIN_PERMS = [IsAuthenticated, IsAdminUser]


class ProblemListView(generics.ListAPIView):
    """
    GET /api/problems/
    Masalalar ro'yxati. Filter: difficulty, tag, search.
    Faqat is_published=True masalalar ko'rinadi.
    """
    serializer_class = ProblemListSerializer
    permission_classes = (AllowAny,)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'tags__name']
    ordering_fields = ['id', 'difficulty', 'created_at']

    def get_queryset(self):
        queryset = Problem.objects.filter(is_published=True).prefetch_related('tags')

        # Difficulty filter
        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)

        # Tag filter
        tag = self.request.query_params.get('tag')
        if tag:
            queryset = queryset.filter(tags__slug=tag)

        return queryset.distinct()


class ProblemDetailView(generics.RetrieveAPIView):
    """
    GET /api/problems/{slug}/
    Masala batafsil. Sample test caselar bilan.
    Faqat is_published=True masalalar ko'rinadi.
    """
    serializer_class = ProblemDetailSerializer
    permission_classes = (AllowAny,)
    lookup_field = 'slug'

    def get_queryset(self):
        if self.request.user.is_staff:
            return Problem.objects.prefetch_related('tags', 'test_cases')
        return Problem.objects.filter(is_published=True).prefetch_related('tags', 'test_cases')


# ----------------------------------------------------------------------
# ADMIN VIEWS
# ----------------------------------------------------------------------

class AdminDashboardView(APIView):
    permission_classes = ADMIN_PERMS

    def get(self, request):
        from apps.submissions.models import Submission
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)

        total_subs = Submission.objects.filter(run_type='submit').count()
        ac_subs = Submission.objects.filter(run_type='submit', status='accepted').count()

        return Response({
            'problems': {
                'total': Problem.objects.count(),
                'published': Problem.objects.filter(is_published=True).count(),
                'draft': Problem.objects.filter(is_published=False).count(),
                'by_difficulty': {
                    d: Problem.objects.filter(difficulty=d.lower()).count()
                    for d in ['Easy', 'Medium', 'Hard']
                },
            },
            'submissions': {
                'total': total_subs,
                'accepted': ac_subs,
                'today': Submission.objects.filter(
                    run_type='submit', created_at__date=today
                ).count(),
                'week': Submission.objects.filter(
                    run_type='submit', created_at__date__gte=week_ago
                ).count(),
                'acceptance_rate': round(ac_subs / total_subs * 100, 1) if total_subs else 0,
            },
            'users': {
                'total': User.objects.count(),
                'active': User.objects.filter(last_login__date__gte=week_ago).count(),
            },
        })


class AdminProblemListView(generics.ListCreateAPIView):
    permission_classes = ADMIN_PERMS

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AdminProblemDetailSerializer
        return AdminProblemListSerializer

    def get_queryset(self):
        qs = Problem.objects.annotate(
            testcase_count=Count('test_cases', distinct=True),
            submission_count=Count('submissions', distinct=True),
        ).prefetch_related('tags').order_by('-created_at')

        q = self.request.query_params.get('q')
        diff = self.request.query_params.get('difficulty')
        pub = self.request.query_params.get('published')

        if q:
            qs = qs.filter(title__icontains=q)
        if diff:
            qs = qs.filter(difficulty=diff.lower())
        if pub == 'true':
            qs = qs.filter(is_published=True)
        elif pub == 'false':
            qs = qs.filter(is_published=False)

        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class AdminProblemDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = ADMIN_PERMS
    lookup_field = 'slug'

    def get_serializer_class(self):
        return AdminProblemDetailSerializer

    def get_queryset(self):
        return Problem.objects.annotate(
            testcase_count=Count('test_cases', distinct=True),
            submission_count=Count('submissions', distinct=True),
        ).prefetch_related('tags', 'test_cases')


class ProblemTestCasesView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, slug):
        problem  = get_object_or_404(Problem, slug=slug)
        base_dir = get_testcases_dir(slug)

        db_tests = TestCase.objects.filter(problem=problem).order_by('file_number', 'id')

        file_count = len(glob.glob(os.path.join(base_dir, '*.in'))) if os.path.exists(base_dir) else 0
        sample_count = db_tests.filter(is_sample=True).count()
        hidden_count = db_tests.filter(is_sample=False).count()

        return Response({
            'tests': [{
                'id':          t.id,
                'input':       t.input_data,
                'output':      t.expected_output,
                'is_sample':   t.is_sample,
                'file_number': t.file_number,
            } for t in db_tests],
            'stats': {
                'total':   db_tests.count(),
                'sample':  sample_count,
                'hidden':  hidden_count,
                'files':   file_count,
            },
            'file_path': f'testcases/{slug}/',
        })

    def post(self, request, slug):
        """Yangi test qo'shish — DB + fayl."""
        problem  = get_object_or_404(Problem, slug=slug)
        base_dir = get_testcases_dir(slug)

        inp       = request.data.get('input', '').strip()
        out       = request.data.get('output', '').strip()
        is_sample = request.data.get('is_sample', False)

        if not inp or not out:
            return Response(
                {'detail': 'Kirish va chiqish ma\'lumotlari bo\'sh bo\'lmasligi kerak'},
                status=400
            )

        # KRITIK FIX: file_number alohida hisoblanadi
        file_number = get_next_file_number(base_dir)

        # Faylga yozish
        write_test_file(base_dir, file_number, inp, out)

        # DB ga saqlash
        tc = TestCase.objects.create(
            problem         = problem,
            input_data      = inp,
            expected_output = out,
            is_sample       = is_sample,
            file_number     = file_number,
        )

        logger.info(f'✅ Test #{file_number} yaratildi: {slug}')

        return Response({
            'id':          tc.id,
            'input':       tc.input_data,
            'output':      tc.expected_output,
            'is_sample':   tc.is_sample,
            'file_number': tc.file_number,
            'file_path':   f'testcases/{slug}/{file_number}.in',
        }, status=201)


class TestCaseUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, pk):
        tc       = get_object_or_404(TestCase, pk=pk)
        base_dir = get_testcases_dir(tc.problem.slug)

        if 'input'     in request.data: tc.input_data      = request.data['input']
        if 'output'    in request.data: tc.expected_output = request.data['output']
        if 'is_sample' in request.data: tc.is_sample       = request.data['is_sample']
        tc.save()

        # KRITIK FIX: file_number ishlatiladi — id emas
        if tc.file_number and os.path.exists(base_dir):
            write_test_file(
                base_dir, tc.file_number,
                tc.input_data, tc.expected_output
            )
            logger.info(f'✅ Test #{tc.file_number} yangilandi: {tc.problem.slug}')

        return Response({
            'id':          tc.id,
            'input':       tc.input_data,
            'output':      tc.expected_output,
            'is_sample':   tc.is_sample,
            'file_number': tc.file_number,
        })

    def delete(self, request, pk):
        tc       = get_object_or_404(TestCase, pk=pk)
        base_dir = get_testcases_dir(tc.problem.slug)

        # KRITIK FIX: file_number bo'yicha o'chirish
        if tc.file_number:
            delete_test_file(base_dir, tc.file_number)
            logger.info(f'🗑 Test #{tc.file_number} o\'chirildi: {tc.problem.slug}')

        tc.delete()
        return Response(status=204)


class BulkTestCaseImportView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, slug):
        """
        Ko'p testlarni to'g'ridan import qilish.
        tests = [{'input': '...', 'output': '...', 'is_sample': false}, ...]
        """
        problem  = get_object_or_404(Problem, slug=slug)
        base_dir = get_testcases_dir(slug)
        tests    = request.data.get('tests', [])

        if not tests:
            return Response({'detail': 'Testlar bo\'sh'}, status=400)

        clear = request.data.get('clear_existing', False)
        if clear:
            # Eski testlarni o'chirish
            old_tests = TestCase.objects.filter(problem=problem)
            for t in old_tests:
                if t.file_number:
                    delete_test_file(base_dir, t.file_number)
            old_tests.delete()
            logger.info(f'🗑 Eski testlar tozalandi: {slug}')

        os.makedirs(base_dir, exist_ok=True)
        created = []

        for test in tests:
            inp = test.get('input', '').strip()
            out = test.get('output', '').strip()
            if not inp or not out:
                continue

            file_number = get_next_file_number(base_dir)
            write_test_file(base_dir, file_number, inp, out)

            tc = TestCase.objects.create(
                problem         = problem,
                input_data      = inp,
                expected_output = out,
                is_sample       = test.get('is_sample', False),
                file_number     = file_number,
            )
            created.append(tc.id)

        logger.info(f'✅ {len(created)} ta test import qilindi: {slug}')

        return Response({
            'imported':  len(created),
            'file_path': f'testcases/{slug}/',
        }, status=201)


class ZipTestCaseImportView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, slug):
        """
        ZIP fayldan testlarni import qilish.
        ZIP ichida: 1.in, 1.out, 2.in, 2.out, ...
        """
        problem  = get_object_or_404(Problem, slug=slug)
        base_dir = get_testcases_dir(slug)

        zip_file = request.FILES.get('zip_file')
        if not zip_file:
            return Response({'detail': 'ZIP fayl yuklanmadi'}, status=400)

        if zip_file.size > 50 * 1024 * 1024:  # 50MB limit
            return Response({'detail': 'ZIP fayl 50MB dan katta bo\'lmasligi kerak'}, status=400)

        try:
            zf = zipfile.ZipFile(io.BytesIO(zip_file.read()))
        except zipfile.BadZipFile:
            return Response({'detail': 'Noto\'g\'ri ZIP fayl'}, status=400)

        # ── ZIP bomb himoyasi ─────────────────────────────────────────────────
        MAX_UNCOMPRESSED = 200 * 1024 * 1024  # 200 MB
        total_uncompressed = sum(info.file_size for info in zf.infolist())
        if total_uncompressed > MAX_UNCOMPRESSED:
            return Response(
                {'detail': 'ZIP ichidagi fayllar umumiy hajmi 200MB dan oshmasligi kerak'},
                status=400,
            )

        # ── Path traversal himoyasi ───────────────────────────────────────────
        for name in zf.namelist():
            norm = os.path.normpath(name)
            if norm.startswith('..') or os.path.isabs(norm):
                return Response(
                    {'detail': f'Xavfli fayl nomi ZIP ichida: {name}'},
                    status=400,
                )

        # .in fayllarni topish va tartiblash
        in_files = sorted(
            [n for n in zf.namelist() if n.endswith('.in') and not n.startswith('__')],
            key=lambda x: int(''.join(filter(str.isdigit, os.path.basename(x))) or '0')
        )

        if not in_files:
            return Response({'detail': 'ZIP ichida .in fayl topilmadi'}, status=400)

        clear = request.data.get('clear_existing', 'false').lower() == 'true'
        if clear:
            old_tests = TestCase.objects.filter(problem=problem)
            for t in old_tests:
                if t.file_number:
                    delete_test_file(base_dir, t.file_number)
            old_tests.delete()

        os.makedirs(base_dir, exist_ok=True)
        created = []
        errors  = []

        for in_name in in_files:
            out_name = in_name.replace('.in', '.out')
            if out_name not in zf.namelist():
                errors.append(f'{in_name} uchun .out fayl topilmadi')
                continue

            try:
                inp = zf.read(in_name).decode('utf-8').strip()
                out = zf.read(out_name).decode('utf-8').strip()
            except Exception as e:
                errors.append(f'{in_name} o\'qishda xato: {e}')
                continue

            if not inp or not out:
                continue

            file_number = get_next_file_number(base_dir)
            write_test_file(base_dir, file_number, inp, out)

            tc = TestCase.objects.create(
                problem         = problem,
                input_data      = inp,
                expected_output = out,
                is_sample       = False,
                file_number     = file_number,
            )
            created.append(tc.id)

        logger.info(f'✅ ZIP import: {len(created)} ta test — {slug}')

        return Response({
            'imported': len(created),
            'errors':   errors,
            'file_path': f'testcases/{slug}/',
        }, status=201)


class AdminTagListView(generics.ListCreateAPIView):
    permission_classes = ADMIN_PERMS
    serializer_class = TagSerializer

    def get_queryset(self):
        return Tag.objects.annotate(
            problem_count=Count('problems', distinct=True)
        ).order_by('name')


# ──────────────────────────────────────────────
# DISCUSSION (MUHOKAMA) VIEWS
# ──────────────────────────────────────────────

class ProblemCommentsView(APIView):
    """
    GET  /api/problems/{slug}/comments/  — muhokama ro'yxati
    POST /api/problems/{slug}/comments/  — yangi kommentariya (auth kerak)
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request, slug):
        problem = get_object_or_404(Problem, slug=slug, is_published=True)
        # Faqat top-level kommentlar; replies serializerda ichida keladi
        qs = (
            ProblemComment.objects
            .filter(problem=problem, parent__isnull=True, is_hidden=False)
            .select_related('author')
            .prefetch_related('replies__author', 'likes', 'replies__likes')
            .order_by('-like_count', '-created_at')
        )
        serializer = ProblemCommentSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, slug):
        problem = get_object_or_404(Problem, slug=slug, is_published=True)
        serializer = ProblemCommentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        parent = serializer.validated_data.get('parent')
        if parent and parent.problem_id != problem.id:
            return Response({'detail': 'Parent boshqa masalaga tegishli.'}, status=400)

        comment = serializer.save(problem=problem, author=request.user)
        out = ProblemCommentSerializer(comment, context={'request': request})
        return Response(out.data, status=201)


class CommentDetailView(APIView):
    """
    DELETE /api/problems/comments/{id}/  — o'z kommentariyasini o'chirish
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        comment = get_object_or_404(ProblemComment, pk=pk)
        if comment.author_id != request.user.id and not request.user.is_staff:
            return Response({'detail': 'Ruxsat yo\'q.'}, status=403)
        comment.delete()
        return Response(status=204)


class CommentLikeView(APIView):
    """
    POST /api/problems/comments/{id}/like/  — like toggle (qo'shish/olib tashlash)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        comment = get_object_or_404(ProblemComment, pk=pk, is_hidden=False)
        like, created = CommentLike.objects.get_or_create(
            comment=comment, user=request.user
        )
        if created:
            ProblemComment.objects.filter(pk=pk).update(
                like_count=F('like_count') + 1
            )
            liked = True
        else:
            like.delete()
            ProblemComment.objects.filter(pk=pk).update(
                like_count=F('like_count') - 1
            )
            liked = False

        comment.refresh_from_db(fields=['like_count'])
        return Response({'liked': liked, 'like_count': comment.like_count})


# ──────────────────────────────────────────────
# RATING VIEWS
# ──────────────────────────────────────────────

class ProblemRatingView(APIView):
    """
    GET  /api/problems/{slug}/rating/  — reyting statistikasi
    POST /api/problems/{slug}/rating/  — baholash yoki yangilash (auth kerak)
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request, slug):
        problem = get_object_or_404(Problem, slug=slug, is_published=True)
        ratings = ProblemRating.objects.filter(problem=problem)
        agg = ratings.aggregate(average=Avg('rating'))
        count = ratings.count()
        distribution = {str(i): ratings.filter(rating=i).count() for i in range(1, 6)}

        user_rating = None
        if request.user.is_authenticated:
            try:
                user_rating = ratings.get(user=request.user).rating
            except ProblemRating.DoesNotExist:
                pass

        serializer = ProblemRatingStatsSerializer({
            'average': round(agg['average'] or 0, 1),
            'count': count,
            'distribution': distribution,
            'user_rating': user_rating,
        })
        return Response(serializer.data)

    def post(self, request, slug):
        problem = get_object_or_404(Problem, slug=slug, is_published=True)
        serializer = ProblemRatingWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        rating_obj, _ = ProblemRating.objects.update_or_create(
            problem=problem,
            user=request.user,
            defaults={'rating': serializer.validated_data['rating']},
        )

        # Yangilangan statistikani qaytaramiz
        ratings = ProblemRating.objects.filter(problem=problem)
        agg = ratings.aggregate(average=Avg('rating'))
        return Response({
            'user_rating': rating_obj.rating,
            'average': round(agg['average'] or 0, 1),
            'count': ratings.count(),
        })

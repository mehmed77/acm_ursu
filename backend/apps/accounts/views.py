import json as json_mod
import logging

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model, authenticate

from .hemis_service import HemisService
from .serializers import (
    RegisterSerializer,
    UserProfileSerializer,
    CustomTokenObtainPairSerializer,
)

logger = logging.getLogger(__name__)
User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Yangi foydalanuvchi ro'yxatdan o'tkazish.
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (AllowAny,)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "message": "Foydalanuvchi muvaffaqiyatli ro'yxatdan o'tdi.",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                }
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    POST /api/auth/login/
    Body: {"username": "...", "password": "..."}

    Unified login — avval oddiy login, keyin HEMIS.
    1. Django authenticate() bilan sinab ko'radi
    2. Agar muvaffaqiyatsiz bo'lsa, HEMIS API ga login/parol yuboradi
    3. HEMIS muvaffaqiyatli bo'lsa, user yaratadi/yangilaydi va JWT qaytaradi
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not username or not password:
            return Response(
                {'detail': 'Username va parol kiritilishi shart'},
                status=400,
            )

        # ━━━ 1. Oddiy Django login ━━━
        user = authenticate(request, username=username, password=password)

        if user is not None:
            if not user.is_active:
                return Response(
                    {'detail': 'Hisob bloklangan'},
                    status=403,
                )

            refresh = RefreshToken.for_user(user)

            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': self._user_response(user),
            })

        # ━━━ 2. HEMIS login ━━━
        hemis_result = HemisService.login_with_credentials(username, password)

        if not hemis_result['success']:
            # Ikkala usul ham muvaffaqiyatsiz
            return Response(
                {'detail': "Login yoki parol noto'g'ri"},
                status=401,
            )

        hemis_token = hemis_result['token']
        hemis_refresh_token = hemis_result.get('refresh_token', '')

        # HEMIS dan talaba ma'lumotini olish
        info_result = HemisService.get_student_info(hemis_token)

        if not info_result['success']:
            return Response(
                {'detail': f'HEMIS xatosi: {info_result["error"]}'},
                status=400,
            )

        # User yaratish / yangilash (hash bilan smart update)
        try:
            user, created = HemisService.get_or_create_user(
                hemis_data=info_result['data'],
                hemis_token=hemis_token,
                hemis_refresh=hemis_refresh_token,
            )
        except Exception as exc:
            logger.exception('HEMIS user yaratishda xato: %s', exc)
            return Response(
                {'detail': "Foydalanuvchi ma'lumotlarini saqlashda xato"},
                status=500,
            )

        refresh = RefreshToken.for_user(user)

        logger.info(
            '%s HEMIS login: %s (hemis_id=%s)',
            '✅ Yangi' if created else '🔄 Qayta',
            user.username,
            user.hemis_id,
        )

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': self._user_response(user),
        })

    @staticmethod
    def _user_response(user):
        """User response dictionary."""
        data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': getattr(user, 'full_name', '') or '',
            'first_name': user.first_name,
            'last_name': user.last_name,
            'avatar_url': getattr(user, 'avatar_url', '') or '',
            'is_staff': user.is_staff,
            'rating': getattr(user, 'rating', 0) or 0,
            'solved_count': getattr(user, 'solved_count', 0) or 0,
            'is_hemis_user': getattr(user, 'is_hemis_user', False),
        }

        # HEMIS user uchun qo'shimcha ma'lumotlar
        if getattr(user, 'is_hemis_user', False):
            data.update({
                'hemis_id': user.hemis_id,
                'university': user.university,
                'faculty': user.faculty,
                'faculty_id': user.faculty_id,
                'group_name': user.group_name,
                'group_id': user.group_id,
                'specialty': user.specialty_name,
                'student_level': user.student_level,
                'semester': user.semester_name,
                'avg_gpa': str(user.avg_gpa) if user.avg_gpa else None,
                'student_status': user.student_status,
            })

        return data


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET/PUT /api/auth/profile/
    Joriy foydalanuvchi profili.
    """
    serializer_class = UserProfileSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user.profile


# ═══════════════════════════════════════════════════════
#  HEMIS SYNC
# ═══════════════════════════════════════════════════════

class HemisSyncView(APIView):
    """
    POST /api/auth/hemis/sync/
    Mavjud HEMIS user ma'lumotlarini qayta sinc qiladi.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if not user.is_hemis_user or not user.hemis_token:
            return Response(
                {'detail': 'Bu foydalanuvchi HEMIS orqali kirmagan'},
                status=400,
            )

        result = HemisService.get_student_info(user.hemis_token)

        if not result['success']:
            return Response(
                {'detail': f'HEMIS sinc xatosi: {result["error"]}'},
                status=400,
            )

        user, _ = HemisService.get_or_create_user(
            hemis_data=result['data'],
            hemis_token=user.hemis_token,
            hemis_refresh=user.hemis_refresh or '',
        )

        return Response({
            'success': True,
            'synced_at': user.hemis_synced_at,
            'message': "Ma'lumotlar yangilandi",
        })


# ═══════════════════════════════════════════════════════
#  ADMIN
# ═══════════════════════════════════════════════════════

class AdminLoginView(APIView):
    """
    POST /api/admin/login/
    Faqat is_staff=True foydalanuvchilar kirishi mumkin bo'lgan login.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not username or not password:
            return Response(
                {'detail': 'Username va parol kiritilishi shart'},
                status=400
            )

        user = authenticate(
            request, username=username, password=password
        )

        if user is None:
            return Response(
                {'detail': 'Username yoki parol noto\'g\'ri'},
                status=401
            )

        if not user.is_active:
            return Response(
                {'detail': 'Hisob bloklangan'},
                status=403
            )

        if not user.is_staff:
            return Response(
                {'detail': 'Sizda admin huquqi yo\'q'},
                status=403
            )

        refresh = RefreshToken.for_user(user)

        return Response({
            'access':  str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id':           user.id,
                'username':     user.username,
                'email':        user.email,
                'is_staff':     user.is_staff,
                'is_superuser': user.is_superuser,
            }
        })


class AdminUserListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        from apps.accounts.models import User
        users = User.objects.all().order_by('-date_joined')

        q = request.query_params.get('q', '')
        if q:
            users = users.filter(
                username__icontains=q
            ) | users.filter(
                email__icontains=q
            )

        data = []
        for u in users:
            data.append({
                'id':           u.id,
                'username':     u.username,
                'email':        u.email,
                'is_staff':     u.is_staff,
                'is_superuser': u.is_superuser,
                'is_active':    u.is_active,
                'rating':       getattr(u, 'rating', 0) or 0,
                'solved_count': getattr(u, 'solved_count', 0) or 0,
                'date_joined':  u.date_joined.isoformat(),
                'last_login':   u.last_login.isoformat() if u.last_login else None,
            })

        return Response({'results': data, 'count': len(data)})


class AdminUserUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, pk):
        from apps.accounts.models import User
        from django.shortcuts import get_object_or_404
        user = get_object_or_404(User, pk=pk)

        if user == request.user:
            return Response(
                {'detail': 'O\'zingizni o\'zgartira olmaysiz'},
                status=400
            )

        allowed = ['is_staff', 'is_active']
        for field in allowed:
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save()

        return Response({
            'id':        user.id,
            'is_staff':  user.is_staff,
            'is_active': user.is_active,
        })


class UserProfileView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, username):
        from apps.accounts.models import User
        from apps.submissions.models import Submission
        from apps.problems.models import Problem
        from django.shortcuts import get_object_or_404
        from django.db import models
        from django.utils import timezone
        from datetime import timedelta

        user = get_object_or_404(
            User, username=username, is_active=True
        )

        submit_qs = Submission.objects.filter(
            user=user, run_type='submit'
        )
        total    = submit_qs.count()
        accepted = submit_qs.filter(status='accepted').count()

        by_status = {}
        for s in [
            'accepted', 'wrong_answer',
            'time_limit_exceeded',
            'runtime_error', 'compilation_error'
        ]:
            by_status[s] = submit_qs.filter(status=s).count()

        user_rating = getattr(user, 'rating', 0) or 0
        rank = User.objects.filter(
            is_active=True, rating__gt=user_rating
        ).count() + 1

        total_users = User.objects.filter(is_active=True).count()

        all_problems = Problem.objects.filter(
            is_published=True
        ).order_by('slug').values('id', 'slug', 'title')

        solved_ids = set(
            submit_qs.filter(status='accepted').values_list('problem_id', flat=True)
        )
        attempted_ids = set(
            submit_qs.exclude(status='accepted').values_list('problem_id', flat=True)
        ) - solved_ids
        wrong_ids = set(
            submit_qs.filter(status='wrong_answer').values_list('problem_id', flat=True)
        ) - solved_ids

        problem_map = []
        for p in all_problems:
            if p['id'] in solved_ids:
                st = 'solved'
            elif p['id'] in wrong_ids:
                st = 'wrong'
            elif p['id'] in attempted_ids:
                st = 'attempted'
            else:
                st = 'none'
            problem_map.append({
                'slug': p['slug'], 'title': p['title'], 'status': st,
            })

        today = timezone.now().date()
        year_ago = today - timedelta(days=364)

        daily_counts = {}
        activity = submit_qs.filter(
            created_at__date__gte=year_ago
        ).extra(
            select={'day': 'DATE(created_at)'}
        ).values('day').annotate(count=models.Count('id'))

        for row in activity:
            daily_counts[str(row['day'])] = row['count']

        heatmap = []
        for i in range(364, -1, -1):
            day = today - timedelta(days=i)
            heatmap.append({
                'date': str(day),
                'count': daily_counts.get(str(day), 0),
            })

        recent_subs = submit_qs.select_related(
            'problem'
        ).order_by('-created_at')[:15]

        recent_data = [{
            'id':            s.id,
            'problem_slug':  s.problem.slug,
            'problem_title': s.problem.title,
            'language':      s.language,
            'status':        s.status,
            'time_used':     s.time_used or 0,
            'memory_used':   s.memory_used or 0,
            'created_at':    s.created_at.isoformat(),
        } for s in recent_subs]

        response_data = {
            'username':     user.username,
            'rating':       user_rating,
            'max_rating':   getattr(user, 'max_rating', user_rating) or user_rating,
            'solved_count': getattr(user, 'solved_count', 0) or 0,
            'rank':         rank,
            'total_users':  total_users,
            'date_joined':  user.date_joined.isoformat(),
            'last_login':   user.last_login.isoformat() if user.last_login else None,
            'stats': {
                'total':           total,
                'accepted':        accepted,
                'by_status':       by_status,
                'acceptance_rate': round(accepted / total * 100, 1) if total else 0,
            },
            'problem_map':        problem_map,
            'heatmap':            heatmap,
            'recent_submissions': recent_data,
            'total_problems':     len(problem_map),
        }

        # Ruxsatlarni tekshirish (HEMIS ma'lumotlari uchun)
        is_owner = request.user.is_authenticated and request.user.id == user.id
        is_admin = request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser)

        if getattr(user, 'is_hemis_user', False):
            response_data['is_hemis_user'] = True
            
            # Faqat o'ziga yoki adminga ko'rinadigan qism
            if is_owner or is_admin:
                response_data.update({
                    'university':      user.university,
                    'faculty':         user.faculty,
                    'faculty_id':      user.faculty_id,
                    'group_name':      user.group_name,
                    'group_id':        user.group_id,
                    'specialty_name':  user.specialty_name,
                    'student_level':   user.student_level,
                    'semester_name':   user.semester_name,
                    'education_form':  user.education_form,
                    'payment_form':    user.payment_form,
                    'avg_gpa':         str(user.avg_gpa) if user.avg_gpa else None,
                    'student_status':  user.student_status,
                    'education_lang':  user.education_lang,
                })

        return Response(response_data)


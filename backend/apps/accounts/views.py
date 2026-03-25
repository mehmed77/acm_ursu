import json as json_mod
import hmac
import logging
import secrets

from django.conf import settings as djsettings
from django.db.models.functions import TruncDate

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework_simplejwt.exceptions import InvalidToken
from django.contrib.auth import get_user_model, authenticate
from django.core.cache import cache


# ── httpOnly Cookie yordamchisi ───────────────────────────────────────────────

_COOKIE_ACCESS_AGE  = 60 * 60          # 1 soat (ACCESS_TOKEN_LIFETIME bilan bir xil)
_COOKIE_REFRESH_AGE = 7 * 24 * 60 * 60 # 7 kun (REFRESH_TOKEN_LIFETIME bilan bir xil)


def _set_auth_cookies(response, access_token, refresh_token=None):
    """
    JWT tokenlarni httpOnly cookie sifatida o'rnatadi.
    - httponly=True  → JavaScript o'qiy olmaydi (XSS himoyasi)
    - samesite='Lax' → Cross-site POST da cookie yuborilmaydi (CSRF himoyasi)
    - secure         → Production da faqat HTTPS orqali yuboriladi
    """
    is_secure = not djsettings.DEBUG
    common = dict(httponly=True, secure=is_secure, samesite='Lax', path='/')
    response.set_cookie('access_token', str(access_token),
                        max_age=_COOKIE_ACCESS_AGE, **common)
    if refresh_token is not None:
        response.set_cookie('refresh_token', str(refresh_token),
                            max_age=_COOKIE_REFRESH_AGE, **common)


def _clear_auth_cookies(response):
    """Login chiqishda tokenlarni o'chiradi."""
    response.delete_cookie('access_token',  path='/')
    response.delete_cookie('refresh_token', path='/')

from .hemis_service import HemisService
from .serializers import (
    RegisterSerializer,
    UserProfileSerializer,
    CustomTokenObtainPairSerializer,
)

logger = logging.getLogger(__name__)
User = get_user_model()

# ── Login brute-force sozlamalari ───────────────────────────────────────────
_MAX_ATTEMPTS      = 5      # necha marta xato kiritilganda bloklash
_LOCKOUT_SECONDS   = 600    # 10 daqiqa
_WINDOW_SECONDS    = 600    # hisoblagich TTL (10 daqiqa)
_FAIL_KEY   = 'login_fail:{}'    # format: username (kichik harf)
_LOCKED_KEY = 'login_locked:{}'  # format: username (kichik harf)


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
        refresh = RefreshToken.for_user(user)
        response = Response(
            {
                "message": "Foydalanuvchi muvaffaqiyatli ro'yxatdan o'tdi.",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "rating": user.rating,
                    "solved_count": user.solved_count,
                }
            },
            status=status.HTTP_201_CREATED,
        )
        _set_auth_cookies(response, refresh.access_token, refresh)
        return response


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

        # ━━━ 0. Brute-force tekshiruvi ━━━
        key_base   = username.lower()
        lock_key   = _LOCKED_KEY.format(key_base)
        fail_key   = _FAIL_KEY.format(key_base)

        if cache.get(lock_key):
            return Response(
                {
                    'detail': (
                        "Hisob 10 daqiqaga bloklandi. "
                        "Parolni unutdingizmi? Parolni tiklash uchun "
                        "'Parolni unutdim' tugmasini bosing."
                    ),
                    'locked': True,
                },
                status=429,
            )

        # ━━━ 1. Oddiy Django login ━━━
        user = authenticate(request, username=username, password=password)

        if user is not None:
            if not user.is_active:
                return Response(
                    {'detail': 'Hisob bloklangan'},
                    status=403,
                )

            # Muvaffaqiyatli kirish — hisoblagichni tozalash
            cache.delete(fail_key)
            cache.delete(lock_key)

            refresh = RefreshToken.for_user(user)
            response = Response({'user': self._user_response(user)})
            _set_auth_cookies(response, refresh.access_token, refresh)
            return response

        # ━━━ 2. HEMIS login ━━━
        hemis_result = HemisService.login_with_credentials(username, password)

        if not hemis_result['success']:
            # Ikkala usul ham muvaffaqiyatsiz — hisoblagichni oshirish
            attempts = (cache.get(fail_key) or 0) + 1
            remaining = _MAX_ATTEMPTS - attempts

            if attempts >= _MAX_ATTEMPTS:
                cache.set(lock_key, 1, timeout=_LOCKOUT_SECONDS)
                cache.delete(fail_key)
                return Response(
                    {
                        'detail': (
                            "5 marta noto'g'ri parol kiritildi. "
                            "Hisob 10 daqiqaga bloklandi."
                        ),
                        'locked': True,
                    },
                    status=429,
                )

            cache.set(fail_key, attempts, timeout=_WINDOW_SECONDS)
            return Response(
                {
                    'detail': (
                        f"Login yoki parol noto'g'ri. "
                        f"{remaining} ta urinish qoldi."
                    ),
                    'attempts_remaining': remaining,
                },
                status=401,
            )

        # HEMIS muvaffaqiyatli — hisoblagichni tozalash
        cache.delete(fail_key)
        cache.delete(lock_key)

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

        response = Response({'user': self._user_response(user)})
        _set_auth_cookies(response, refresh.access_token, refresh)
        return response

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

_ADMIN_MAX_ATTEMPTS    = 5
_ADMIN_LOCKOUT_SECONDS = 1800   # 30 daqiqa (oddiy logindan qattiqroq)
_ADMIN_FAIL_KEY        = 'admin_login_fail:{}'
_ADMIN_LOCKED_KEY      = 'admin_login_locked:{}'


class AdminLoginView(APIView):
    """
    POST /api/admin/login/
    Faqat is_staff=True foydalanuvchilar kirishi mumkin bo'lgan login.
    """
    permission_classes = [AllowAny]

    @staticmethod
    def _client_ip(request) -> str:
        forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
        return forwarded.split(',')[0].strip() or request.META.get('REMOTE_ADDR', 'unknown')

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not username or not password:
            return Response(
                {'detail': 'Username va parol kiritilishi shart'},
                status=400
            )

        # ── Brute-force himoyasi (IP + username asosida) ───────────────────
        key_base   = f"{self._client_ip(request)}:{username.lower()}"
        lock_key   = _ADMIN_LOCKED_KEY.format(key_base)
        fail_key   = _ADMIN_FAIL_KEY.format(key_base)

        if cache.get(lock_key):
            return Response(
                {'detail': 'Admin kirish 30 daqiqaga bloklandi.', 'locked': True},
                status=429,
            )

        user = authenticate(
            request, username=username, password=password
        )

        if user is None:
            attempts = (cache.get(fail_key) or 0) + 1
            if attempts >= _ADMIN_MAX_ATTEMPTS:
                cache.set(lock_key, True, timeout=_ADMIN_LOCKOUT_SECONDS)
                cache.delete(fail_key)
            else:
                cache.set(fail_key, attempts, timeout=_ADMIN_LOCKOUT_SECONDS)
            return Response(
                {'detail': 'Username yoki parol noto\'g\'ri'},
                status=401
            )

        # Muvaffaqiyatli kirish — hisoblagichlarni tozalash
        cache.delete(lock_key)
        cache.delete(fail_key)

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

        response = Response({
            'user': {
                'id':           user.id,
                'username':     user.username,
                'email':        user.email,
                'is_staff':     user.is_staff,
                'is_superuser': user.is_superuser,
            }
        })
        _set_auth_cookies(response, refresh.access_token, refresh)
        return response


class CookieTokenRefreshView(APIView):
    """
    POST /api/auth/token/refresh/
    Cookie'dagi refresh_token dan yangi access_token cookie yaratadi.
    Request body talab qilmaydi — cookie avtomatik yuboriladi.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return Response({'detail': 'Refresh token topilmadi'}, status=401)

        try:
            refresh = RefreshToken(refresh_token)
            new_access = refresh.access_token
        except TokenError as exc:
            _clear_auth_cookies(Response())
            raise InvalidToken({'detail': str(exc)}) from exc

        response = Response({'detail': 'Token yangilandi'})
        _set_auth_cookies(response, new_access)   # faqat access yangilanadi
        return response


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    httpOnly cookie'larni o'chiradi va refresh tokenni blacklist qiladi.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass  # token allaqachon eskirgan yoki noto'g'ri

        response = Response({'detail': 'Chiqildi'})
        _clear_auth_cookies(response)
        return response


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
        ).annotate(
            day=TruncDate('created_at')
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


# ═══════════════════════════════════════════════════════
#  TELEGRAM BOG'LASH
# ═══════════════════════════════════════════════════════

class TelegramLinkInitView(APIView):
    """
    POST /api/auth/telegram/link/
    Kirgan foydalanuvchi uchun bir martalik token yaratadi.
    Foydalanuvchi shu tokenni botga yuboradi → bot chat_id ni saqlaydi.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.conf import settings as djsettings

        token = secrets.token_hex(4).upper()  # "A3F2B1C9" kabi 8 belgili
        cache.set(f'tg_link:{token}', request.user.id, timeout=300)  # 5 daqiqa

        bot_username = getattr(djsettings, 'TELEGRAM_BOT_USERNAME', '')
        return Response({
            'token':      token,
            'bot_url':    f'https://t.me/{bot_username}?start=link_{token}',
            'expires_in': 300,
        })


class TelegramWebhookView(APIView):
    """
    POST /api/auth/telegram/webhook/
    Telegram shu URL ga yangilama (update) yuboradi.
    Handles: /start, /start link_TOKEN
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from django.conf import settings as djsettings
        from .telegram_service import send_message

        # Webhook secret tekshiruvi
        webhook_secret = getattr(djsettings, 'TELEGRAM_WEBHOOK_SECRET', '')
        if webhook_secret:
            provided = request.headers.get('X-Telegram-Bot-Api-Secret-Token', '')
            if not hmac.compare_digest(provided, webhook_secret):
                return Response(status=403)

        update  = request.data
        message = update.get('message', {})
        if not message:
            return Response({'ok': True})

        chat_id = message.get('chat', {}).get('id')
        text    = (message.get('text') or '').strip()

        if not chat_id:
            return Response({'ok': True})

        # /start link_TOKEN — hisobni bog'lash
        if text.startswith('/start link_'):
            token   = text[len('/start link_'):]
            user_id = cache.get(f'tg_link:{token}')

            if not user_id:
                send_message(chat_id,
                    '❌ Token eskirgan yoki noto\'g\'ri.\n'
                    'Iltimos, platformada qayta token oling.')
                return Response({'ok': True})

            User.objects.filter(id=user_id).update(telegram_chat_id=chat_id)
            cache.delete(f'tg_link:{token}')

            try:
                user = User.objects.get(id=user_id)
                send_message(chat_id,
                    f'✅ Hisob muvaffaqiyatli bog\'landi!\n\n'
                    f'👤 Foydalanuvchi: <b>{user.username}</b>\n\n'
                    f'Endi parolni unutsangiz, shu bot orqali tiklashingiz mumkin.')
            except User.DoesNotExist:
                pass

        elif text in ('/start', '/help'):
            send_message(chat_id,
                '👋 Salom! Bu <b>Online Judge</b> platformasining yordamchi botidir.\n\n'
                '📌 Nima qila olasiz:\n'
                '• Hisobingizni bot bilan bog\'lash\n'
                '• Parolni unutsangiz OTP orqali tiklash\n\n'
                '🔗 Hisobni bog\'lash uchun: platformada '
                '<b>Profil → Telegram bog\'lash</b> tugmasini bosing.')
        else:
            send_message(chat_id,
                '❓ Buyruq tushunilmadi.\n'
                'Hisobni bog\'lash uchun platformada '
                'Profil → Telegram bog\'lash tugmasini bosing.')

        return Response({'ok': True})


# ═══════════════════════════════════════════════════════
#  PAROLNI TIKLASH (OTP via Telegram)
# ═══════════════════════════════════════════════════════

class PasswordResetRequestView(APIView):
    """
    POST /api/auth/password-reset/request/
    Body: {"username": "..."} yoki {"email": "..."}

    Telegram ga bog'langan hisob bo'lsa 6 xonali OTP yuboradi.
    Xavfsizlik uchun: bir xil javob qaytariladi (user bor/yo'qligini oshkor etmaydi).
    """
    permission_classes = [AllowAny]

    _SAFE_RESPONSE = {
        'detail': (
            "Agar hisob mavjud bo'lsa va Telegram bog'langan bo'lsa, "
            "OTP kod yuborildi."
        )
    }

    def post(self, request):
        from .telegram_service import send_message

        identifier = (
            request.data.get('username') or
            request.data.get('email') or ''
        ).strip()

        if not identifier:
            return Response(
                {'detail': 'Username yoki email kiritilishi shart'},
                status=400,
            )

        # Har 10 daqiqada 3 ta so'rovdan ko'p bo'lmasin
        rate_key = f'pwd_reset_rate:{identifier.lower()}'
        if (cache.get(rate_key) or 0) >= 3:
            return Response(
                {'detail': 'Juda ko\'p so\'rov. 10 daqiqadan keyin urinib ko\'ring.'},
                status=429,
            )
        cache.set(rate_key, (cache.get(rate_key) or 0) + 1, timeout=600)

        # Foydalanuvchini topish (xato bo'lsa ham bir xil javob)
        try:
            if '@' in identifier:
                user = User.objects.get(email=identifier, is_active=True)
            else:
                user = User.objects.get(username=identifier, is_active=True)
        except User.DoesNotExist:
            return Response(self._SAFE_RESPONSE)

        if not user.telegram_chat_id:
            return Response(
                {
                    'detail': (
                        "Bu hisobga Telegram bog'lanmagan. "
                        "Avval hisobingizga kirib, Profil sahifasidan "
                        "Telegram bog'lang."
                    ),
                    'no_telegram': True,
                },
                status=400,
            )

        # 6 xonali OTP (10 daqiqa amal qiladi)
        otp = f'{secrets.randbelow(900000) + 100000}'
        cache.set(f'pwd_reset_otp:{user.id}', otp, timeout=600)

        sent = send_message(
            user.telegram_chat_id,
            f'🔐 <b>Parolni tiklash</b>\n\n'
            f'OTP kodingiz: <code>{otp}</code>\n\n'
            f'⏱ Kod 10 daqiqa davomida amal qiladi.\n'
            f'⚠️ Agar siz so\'rov bermaganing bo\'lsa, e\'tibor bermang.',
        )

        if not sent:
            return Response(
                {'detail': 'Telegram xabari yuborilmadi. Keyinroq urinib ko\'ring.'},
                status=502,
            )

        return Response(self._SAFE_RESPONSE)


class PasswordResetConfirmView(APIView):
    """
    POST /api/auth/password-reset/confirm/
    Body: {"username": "...", "otp": "123456", "new_password": "..."}
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from .telegram_service import send_message

        username     = request.data.get('username', '').strip()
        otp          = request.data.get('otp', '').strip()
        new_password = request.data.get('new_password', '')

        if not all([username, otp, new_password]):
            return Response(
                {'detail': "Barcha maydonlar to'ldirilishi shart"},
                status=400,
            )
        if len(new_password) < 8:
            return Response(
                {'detail': 'Yangi parol kamida 8 belgidan iborat bo\'lishi kerak'},
                status=400,
            )

        try:
            user = User.objects.get(username=username, is_active=True)
        except User.DoesNotExist:
            return Response({'detail': 'Foydalanuvchi topilmadi'}, status=404)

        stored_otp = cache.get(f'pwd_reset_otp:{user.id}')
        if not stored_otp or not hmac.compare_digest(stored_otp, otp):
            return Response(
                {'detail': "OTP noto'g'ri yoki eskirgan"},
                status=400,
            )

        # Parolni yangilash
        user.set_password(new_password)
        user.save(update_fields=['password'])
        cache.delete(f'pwd_reset_otp:{user.id}')

        # Login hisoblagichini ham tozalash
        cache.delete(_LOCKED_KEY.format(username.lower()))
        cache.delete(_FAIL_KEY.format(username.lower()))

        # Telegram orqali bildirishnoma
        if user.telegram_chat_id:
            send_message(
                user.telegram_chat_id,
                '✅ <b>Parolingiz muvaffaqiyatli o\'zgartirildi!</b>\n\n'
                'Agar bu siz bo\'lmasangiz, darhol admin bilan bog\'laning.',
            )

        return Response({'detail': "Parol muvaffaqiyatli o'zgartirildi"})




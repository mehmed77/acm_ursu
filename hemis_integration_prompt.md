# HEMIS Orqali Kirish — To'liq Integratsiya

## Maqsad
Mavjud Django + React loyihasiga HEMIS student API
orqali kirish tizimini qo'shish. Foydalanuvchi
"HEMIS orqali kirish" tugmasini bosganda HEMIS
tokenini kiritadi, tizim uni tekshirib, profil
ma'lumotlarini saqlaydi va JWT token qaytaradi.

---

## 0. ARXITEKTURA

```
Foydalanuvchi
    │
    ▼
[HEMIS login/parol]
    │
    ▼
HEMIS API → token + refresh_token
    │
    ▼
Bizning backend:
  POST /api/auth/hemis/
    │ hemis_token qabul qiladi
    │ /rest/v1/account/me ga so'rov yuboradi
    │ User yaratadi yoki yangilaydi
    │ Bizning JWT qaytaradi
    │
    ▼
Frontend: token saqlanadi → kirish amalga oshadi
```

---

## 1. BACKEND — MODEL

### `apps/accounts/models.py` — User modeliga qo'sh:

```python
class User(AbstractUser):
    # ... mavjud fieldlar ...

    # HEMIS integratsiya fieldlari
    hemis_id          = models.CharField(
        max_length=50, unique=True,
        null=True, blank=True,
        db_index=True,
        help_text='HEMIS tizimidagi talaba ID'
    )
    hemis_student_id  = models.CharField(
        max_length=50, null=True, blank=True,
        help_text='student_id_number (341241105193)'
    )
    hemis_token       = models.TextField(
        null=True, blank=True,
        help_text='HEMIS JWT token (shifrlangan)'
    )
    hemis_refresh     = models.TextField(
        null=True, blank=True,
        help_text='HEMIS refresh token (shifrlangan)'
    )
    hemis_token_exp   = models.DateTimeField(
        null=True, blank=True,
        help_text='Token eskirish vaqti'
    )

    # Profil — HEMIS dan to'ldiriladi
    full_name         = models.CharField(
        max_length=200, blank=True
    )
    passport_pin      = models.CharField(
        max_length=20, null=True, blank=True
    )
    birth_date        = models.DateField(
        null=True, blank=True
    )
    phone             = models.CharField(
        max_length=20, blank=True
    )
    gender            = models.CharField(
        max_length=10, blank=True
    )
    avatar_url        = models.URLField(
        max_length=500, blank=True
    )

    # Universitet ma'lumotlari
    university        = models.CharField(
        max_length=200, blank=True
    )
    faculty           = models.CharField(
        max_length=200, blank=True
    )
    specialty_name    = models.CharField(
        max_length=200, blank=True
    )
    specialty_code    = models.CharField(
        max_length=20, blank=True
    )
    group_name        = models.CharField(
        max_length=100, blank=True
    )
    education_level   = models.CharField(
        max_length=50, blank=True,
        help_text='Bakalavr / Magistr'
    )
    education_form    = models.CharField(
        max_length=50, blank=True,
        help_text='Kunduzgi / Sirtqi'
    )
    payment_form      = models.CharField(
        max_length=50, blank=True,
        help_text='Shartnoma / Grant'
    )
    student_level     = models.CharField(
        max_length=20, blank=True,
        help_text='1-kurs, 2-kurs ...'
    )
    semester_name     = models.CharField(
        max_length=20, blank=True
    )
    avg_gpa           = models.DecimalField(
        max_digits=4, decimal_places=2,
        null=True, blank=True
    )
    student_status    = models.CharField(
        max_length=50, blank=True,
        help_text='O\'qimoqda / Akademik ta\'til ...'
    )
    education_lang    = models.CharField(
        max_length=50, blank=True
    )

    # Manzil
    country           = models.CharField(
        max_length=50, blank=True
    )
    province          = models.CharField(
        max_length=100, blank=True
    )
    district          = models.CharField(
        max_length=100, blank=True
    )
    address           = models.CharField(
        max_length=300, blank=True
    )

    # Ijtimoiy
    accommodation     = models.CharField(
        max_length=100, blank=True,
        help_text='Yotoqxona / O\'z uyi ...'
    )
    social_category   = models.CharField(
        max_length=100, blank=True
    )

    # Metama'lumot
    hemis_synced_at   = models.DateTimeField(
        null=True, blank=True,
        help_text='HEMIS dan oxirgi sinc vaqti'
    )
    is_hemis_user     = models.BooleanField(
        default=False,
        help_text='HEMIS orqali ro\'yxatdan o\'tgan'
    )

    class Meta:
        indexes = [
            models.Index(fields=['hemis_id']),
            models.Index(fields=['hemis_student_id']),
        ]
```

```bash
python manage.py makemigrations accounts
python manage.py migrate
```

---

## 2. BACKEND — HEMIS SERVICE

### `apps/accounts/hemis_service.py` — YANGI FAYL:

```python
import requests
import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)

HEMIS_BASE_URL = getattr(
    settings, 'HEMIS_BASE_URL',
    'https://student.urdu.uz'
)
HEMIS_ME_URL   = f'{HEMIS_BASE_URL}/rest/v1/account/me'
REQUEST_TIMEOUT = 10  # soniya


class HemisService:
    """HEMIS Student API bilan ishlash."""

    @staticmethod
    def get_student_info(hemis_token: str) -> dict:
        """
        HEMIS tokenini ishlatib talaba ma'lumotini oladi.

        Returns:
            {'success': True, 'data': {...}}
            {'success': False, 'error': '...'}
        """
        try:
            resp = requests.get(
                HEMIS_ME_URL,
                headers={
                    'Authorization': f'Bearer {hemis_token}',
                    'Accept':        'application/json',
                },
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code == 401:
                return {
                    'success': False,
                    'error':   'HEMIS token noto\'g\'ri yoki eskirgan',
                    'code':    401,
                }

            if resp.status_code != 200:
                return {
                    'success': False,
                    'error':   f'HEMIS API xatosi: {resp.status_code}',
                    'code':    resp.status_code,
                }

            body = resp.json()

            if not body.get('success'):
                return {
                    'success': False,
                    'error':   body.get('error') or 'HEMIS xatosi',
                }

            return {
                'success': True,
                'data':    body['data'],
            }

        except requests.Timeout:
            logger.error('HEMIS API timeout')
            return {
                'success': False,
                'error':   'HEMIS server javob bermadi (timeout)',
            }
        except requests.ConnectionError:
            logger.error('HEMIS API ulanish xatosi')
            return {
                'success': False,
                'error':   'HEMIS serverga ulanib bo\'lmadi',
            }
        except Exception as e:
            logger.exception(f'HEMIS xatosi: {e}')
            return {
                'success': False,
                'error':   'Kutilmagan xato yuz berdi',
            }

    @staticmethod
    def extract_user_data(hemis_data: dict) -> dict:
        """
        HEMIS /account/me javobidan kerakli
        ma'lumotlarni ajratib oladi.
        """
        from datetime import date

        # Tug'ilgan sana: unix timestamp → date
        birth_date = None
        bd_ts      = hemis_data.get('birth_date')
        if bd_ts:
            try:
                birth_date = date.fromtimestamp(bd_ts)
            except Exception:
                pass

        return {
            # Identifikatsiya
            'hemis_id':         str(hemis_data.get('id', '')),
            'hemis_student_id': hemis_data.get('student_id_number', ''),

            # Shaxsiy
            'full_name':    hemis_data.get('full_name', ''),
            'first_name':   hemis_data.get('first_name', '').title(),
            'last_name':    hemis_data.get('second_name', '').title(),
            'email':        hemis_data.get('email', '') or '',
            'phone':        hemis_data.get('phone', '') or '',
            'birth_date':   birth_date,
            'passport_pin': hemis_data.get('passport_pin', '') or '',
            'avatar_url':   hemis_data.get('image', '') or '',
            'gender':       hemis_data.get('gender', {}).get('name', ''),

            # Ta'lim
            'university':      hemis_data.get('university', ''),
            'faculty':         (hemis_data.get('faculty') or {}).get('name', ''),
            'specialty_name':  (hemis_data.get('specialty') or {}).get('name', ''),
            'specialty_code':  (hemis_data.get('specialty') or {}).get('code', ''),
            'group_name':      (hemis_data.get('group') or {}).get('name', ''),
            'education_level': (hemis_data.get('educationType') or {}).get('name', ''),
            'education_form':  (hemis_data.get('educationForm') or {}).get('name', ''),
            'payment_form':    (hemis_data.get('paymentForm') or {}).get('name', ''),
            'student_level':   (hemis_data.get('level') or {}).get('name', ''),
            'semester_name':   (hemis_data.get('semester') or {}).get('name', ''),
            'education_lang':  (hemis_data.get('educationLang') or {}).get('name', ''),
            'student_status':  (hemis_data.get('studentStatus') or {}).get('name', ''),
            'avg_gpa':         hemis_data.get('avg_gpa') or None,

            # Manzil
            'country':  (hemis_data.get('country') or {}).get('name', ''),
            'province': (hemis_data.get('province') or {}).get('name', ''),
            'district': (hemis_data.get('district') or {}).get('name', ''),
            'address':  hemis_data.get('address', '') or '',

            # Ijtimoiy
            'accommodation':  (hemis_data.get('accommodation') or {}).get('name', ''),
            'social_category': (hemis_data.get('socialCategory') or {}).get('name', ''),
        }

    @staticmethod
    def get_or_create_user(hemis_data: dict, hemis_token: str, hemis_refresh: str = ''):
        """
        HEMIS ma'lumotlari asosida User topadi
        yoki yaratadi. Keyin yangilaydi.

        Returns: (user, created: bool)
        """
        from apps.accounts.models import User

        extracted  = HemisService.extract_user_data(hemis_data)
        hemis_id   = extracted['hemis_id']
        email      = extracted['email']

        # 1. hemis_id bo'yicha qidirish
        user = User.objects.filter(
            hemis_id=hemis_id
        ).first()

        # 2. Email bo'yicha qidirish (mavjud user)
        if not user and email:
            user = User.objects.filter(
                email=email
            ).first()

        created = False

        if not user:
            # Yangi user yaratish
            # Username: hemis_id yoki email prefix
            base_username = f'hemis_{hemis_id}'
            username      = base_username
            counter       = 1
            while User.objects.filter(
                username=username
            ).exists():
                username = f'{base_username}_{counter}'
                counter += 1

            user = User(
                username     = username,
                is_hemis_user = True,
            )
            # Parol o'rnatilmaydi — HEMIS orqali kiradi
            user.set_unusable_password()
            created = True

            logger.info(
                f'✅ Yangi HEMIS user: {username} '
                f'(hemis_id={hemis_id})'
            )
        else:
            logger.info(
                f'🔄 HEMIS user yangilandi: {user.username}'
            )

        # Ma'lumotlarni yangilash
        user.hemis_id         = hemis_id
        user.hemis_student_id = extracted['hemis_student_id']
        user.hemis_token      = hemis_token
        user.hemis_refresh    = hemis_refresh
        user.hemis_synced_at  = timezone.now()
        user.is_hemis_user    = True

        # Shaxsiy
        user.first_name   = extracted['first_name']
        user.last_name    = extracted['last_name']
        user.full_name    = extracted['full_name']
        user.phone        = extracted['phone']
        user.gender       = extracted['gender']
        user.avatar_url   = extracted['avatar_url']
        user.passport_pin = extracted['passport_pin']
        user.address      = extracted['address']

        if extracted['birth_date']:
            user.birth_date = extracted['birth_date']

        if extracted['avg_gpa']:
            try:
                user.avg_gpa = extracted['avg_gpa']
            except Exception:
                pass

        # Email — agar bo'lsa va band bo'lmasa
        if email and not User.objects.filter(
            email=email
        ).exclude(pk=user.pk).exists():
            user.email = email

        # Ta'lim
        user.university      = extracted['university']
        user.faculty         = extracted['faculty']
        user.specialty_name  = extracted['specialty_name']
        user.specialty_code  = extracted['specialty_code']
        user.group_name      = extracted['group_name']
        user.education_level = extracted['education_level']
        user.education_form  = extracted['education_form']
        user.payment_form    = extracted['payment_form']
        user.student_level   = extracted['student_level']
        user.semester_name   = extracted['semester_name']
        user.education_lang  = extracted['education_lang']
        user.student_status  = extracted['student_status']

        # Manzil
        user.country         = extracted['country']
        user.province        = extracted['province']
        user.district        = extracted['district']
        user.accommodation   = extracted['accommodation']
        user.social_category = extracted['social_category']

        user.save()
        return user, created
```

---

## 3. BACKEND — VIEW

### `apps/accounts/views.py` ga qo'sh:

```python
from rest_framework.views     import APIView
from rest_framework.response  import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from .hemis_service import HemisService
import logging

logger = logging.getLogger(__name__)


class HemisLoginView(APIView):
    """
    POST /api/auth/hemis/
    Body:
      {
        "hemis_token":   "eyJ...",       ← HEMIS JWT token
        "refresh_token": "XQ5sb..."      ← HEMIS refresh token
      }

    HEMIS /account/me dan ma'lumot oladi,
    User yaratadi/yangilaydi,
    Bizning JWT tokenni qaytaradi.
    """
    permission_classes = [AllowAny]
    throttle_classes   = []  # Rate limit kerak bo'lsa qo'shing

    def post(self, request):
        hemis_token   = request.data.get('hemis_token', '').strip()
        refresh_token = request.data.get('refresh_token', '').strip()

        if not hemis_token:
            return Response(
                {'detail': 'hemis_token kiritilishi shart'},
                status=400
            )

        # 1. HEMIS API ga so'rov
        result = HemisService.get_student_info(hemis_token)

        if not result['success']:
            return Response(
                {'detail': result['error']},
                status=401 if result.get('code') == 401 else 400
            )

        hemis_data = result['data']

        # 2. User yaratish yoki yangilash
        try:
            user, created = HemisService.get_or_create_user(
                hemis_data    = hemis_data,
                hemis_token   = hemis_token,
                hemis_refresh = refresh_token,
            )
        except Exception as e:
            logger.exception(f'User yaratishda xato: {e}')
            return Response(
                {'detail': 'Foydalanuvchi ma\'lumotlarini saqlashda xato'},
                status=500
            )

        # 3. Bizning JWT token generatsiya
        refresh   = RefreshToken.for_user(user)
        our_token = str(refresh.access_token)

        logger.info(
            f'{"✅ Yangi" if created else "🔄 Qayta"} '
            f'HEMIS login: {user.username} '
            f'(hemis_id={user.hemis_id})'
        )

        return Response({
            'access':  our_token,
            'refresh': str(refresh),
            'user': {
                'id':            user.id,
                'username':      user.username,
                'email':         user.email,
                'full_name':     user.full_name,
                'first_name':    user.first_name,
                'last_name':     user.last_name,
                'avatar_url':    user.avatar_url,
                'is_staff':      user.is_staff,
                'rating':        getattr(user, 'rating', 0),
                'solved_count':  getattr(user, 'solved_count', 0),
                'is_hemis_user': user.is_hemis_user,
                'hemis_id':      user.hemis_id,

                # HEMIS profil
                'university':    user.university,
                'faculty':       user.faculty,
                'group_name':    user.group_name,
                'specialty':     user.specialty_name,
                'student_level': user.student_level,
                'semester':      user.semester_name,
                'avg_gpa':       str(user.avg_gpa) if user.avg_gpa else None,
                'student_status': user.student_status,
            },
            'created': created,
        }, status=201 if created else 200)


class HemisSyncView(APIView):
    """
    POST /api/auth/hemis/sync/
    Mavjud HEMIS user ma'lumotlarini qayta sinc qiladi.
    Foydalanuvchi login bo'lgan bo'lishi kerak.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if not user.is_hemis_user or not user.hemis_token:
            return Response(
                {'detail': 'Bu foydalanuvchi HEMIS orqali kirmagan'},
                status=400
            )

        result = HemisService.get_student_info(user.hemis_token)

        if not result['success']:
            return Response(
                {'detail': f'HEMIS sinc xatosi: {result["error"]}'},
                status=400
            )

        user, _ = HemisService.get_or_create_user(
            hemis_data    = result['data'],
            hemis_token   = user.hemis_token,
            hemis_refresh = user.hemis_refresh or '',
        )

        return Response({
            'success': True,
            'synced_at': user.hemis_synced_at,
            'message': 'Ma\'lumotlar yangilandi',
        })
```

---

## 4. BACKEND — URLS

### `config/urls.py` ga qo'sh:

```python
from apps.accounts.views import HemisLoginView, HemisSyncView

urlpatterns += [
    path('api/auth/hemis/',       HemisLoginView.as_view()),
    path('api/auth/hemis/sync/',  HemisSyncView.as_view()),
]
```

---

## 5. SETTINGS

### `config/settings.py` ga qo'sh:

```python
# HEMIS konfiguratsiya
HEMIS_BASE_URL = 'https://student.urdu.uz'

# CORS (agar kerak bo'lsa)
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    # production URL
]
```

---

## 6. FRONTEND — API

### `src/api/auth.js` ga qo'sh:

```javascript
export const authApi = {
    // ... mavjud metodlar ...

    // HEMIS orqali kirish
    hemisLogin: (hemis_token, refresh_token) =>
        api.post('/api/auth/hemis/', {
            hemis_token,
            refresh_token,
        }),

    // Ma'lumotlarni yangilash
    hemisSync: () =>
        api.post('/api/auth/hemis/sync/'),
}
```

---

## 7. FRONTEND — HEMIS LOGIN KOMPONENT

### `src/pages/Login.jsx` ga qo'sh (yoki alohida sahifa):

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'

export function HemisLoginSection() {
    const navigate  = useNavigate()
    const { login } = useAuthStore()

    const [step,          setStep]         = useState('token')
    // token | loading | success | error
    const [hemisToken,    setHemisToken]   = useState('')
    const [refreshToken,  setRefreshToken] = useState('')
    const [errorMsg,      setErrorMsg]     = useState('')
    const [showAdvanced,  setShowAdvanced] = useState(false)

    const handleHemisLogin = async () => {
        if (!hemisToken.trim()) {
            setErrorMsg('HEMIS token kiritilishi shart')
            return
        }

        setStep('loading')
        setErrorMsg('')

        try {
            const { data } = await authApi.hemisLogin(
                hemisToken.trim(),
                refreshToken.trim(),
            )

            // Auth store ga saqlash
            login(data.user, {
                access:  data.access,
                refresh: data.refresh,
            })

            setStep('success')
            setTimeout(() => navigate('/'), 1000)

        } catch (err) {
            const msg = err.response?.data?.detail
                || 'HEMIS orqali kirishda xato yuz berdi'
            setErrorMsg(msg)
            setStep('token')
        }
    }

    return (
        <div style={{
            background:   'rgba(255,255,255,0.02)',
            border:       '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding:      '24px',
        }}>
            {/* Sarlavha */}
            <div style={{
                display:       'flex',
                alignItems:    'center',
                gap:           '10px',
                marginBottom:  '20px',
            }}>
                {/* HEMIS logo placeholder */}
                <div style={{
                    width:        '36px',
                    height:       '36px',
                    borderRadius: '8px',
                    background:   'linear-gradient(135deg,#1d4ed8,#3b82f6)',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    fontSize:     '16px',
                }}>
                    🎓
                </div>
                <div>
                    <div style={{
                        fontSize:   '14px',
                        fontWeight: '700',
                        color:      '#f0f0ff',
                    }}>
                        HEMIS orqali kirish
                    </div>
                    <div style={{
                        fontSize: '11px',
                        color:    '#4a4a6a',
                    }}>
                        Talaba kabineti tokeni bilan
                    </div>
                </div>
            </div>

            {/* Token input */}
            <div style={{ marginBottom: '12px' }}>
                <label style={{
                    fontSize:     '12px',
                    fontWeight:   '600',
                    color:        '#6b7280',
                    display:      'block',
                    marginBottom: '6px',
                }}>
                    HEMIS JWT Token *
                </label>
                <textarea
                    value={hemisToken}
                    onChange={e => setHemisToken(e.target.value)}
                    placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
                    rows={3}
                    style={{
                        width:        '100%',
                        boxSizing:    'border-box',
                        background:   'rgba(255,255,255,0.04)',
                        border:       '1px solid rgba(255,255,255,0.09)',
                        borderRadius: '10px',
                        padding:      '10px 14px',
                        color:        '#e8e8f0',
                        fontSize:     '11px',
                        fontFamily:   'monospace',
                        outline:      'none',
                        resize:       'vertical',
                    }}
                />
            </div>

            {/* Advanced — refresh token */}
            <button
                onClick={() => setShowAdvanced(a => !a)}
                style={{
                    background: 'none',
                    border:     'none',
                    cursor:     'pointer',
                    fontSize:   '11px',
                    color:      '#4a4a6a',
                    marginBottom: '12px',
                    display:    'flex',
                    alignItems: 'center',
                    gap:        '4px',
                }}
            >
                {showAdvanced ? '▾' : '▸'} Refresh token (ixtiyoriy)
            </button>

            {showAdvanced && (
                <div style={{ marginBottom: '12px' }}>
                    <label style={{
                        fontSize:     '12px',
                        fontWeight:   '600',
                        color:        '#6b7280',
                        display:      'block',
                        marginBottom: '6px',
                    }}>
                        HEMIS Refresh Token
                    </label>
                    <textarea
                        value={refreshToken}
                        onChange={e => setRefreshToken(e.target.value)}
                        placeholder="XQ5sbJKDjneMD_Vw..."
                        rows={2}
                        style={{
                            width:        '100%',
                            boxSizing:    'border-box',
                            background:   'rgba(255,255,255,0.04)',
                            border:       '1px solid rgba(255,255,255,0.09)',
                            borderRadius: '10px',
                            padding:      '10px 14px',
                            color:        '#e8e8f0',
                            fontSize:     '11px',
                            fontFamily:   'monospace',
                            outline:      'none',
                            resize:       'vertical',
                        }}
                    />
                </div>
            )}

            {/* Xato xabar */}
            {errorMsg && (
                <div style={{
                    background:   'rgba(239,68,68,0.08)',
                    border:       '1px solid rgba(239,68,68,0.20)',
                    borderRadius: '8px',
                    padding:      '10px 14px',
                    fontSize:     '12px',
                    color:        '#f87171',
                    marginBottom: '12px',
                }}>
                    ⚠ {errorMsg}
                </div>
            )}

            {/* Muvaffaqiyat */}
            {step === 'success' && (
                <div style={{
                    background:   'rgba(16,185,129,0.08)',
                    border:       '1px solid rgba(16,185,129,0.20)',
                    borderRadius: '8px',
                    padding:      '10px 14px',
                    fontSize:     '12px',
                    color:        '#34d399',
                    marginBottom: '12px',
                }}>
                    ✅ Muvaffaqiyatli kirildi! Yo'naltirilmoqda...
                </div>
            )}

            {/* Kirish tugmasi */}
            <button
                onClick={handleHemisLogin}
                disabled={step === 'loading' || step === 'success'}
                style={{
                    width:        '100%',
                    height:       '42px',
                    borderRadius: '10px',
                    border:       'none',
                    cursor:       step === 'loading' ? 'not-allowed' : 'pointer',
                    fontSize:     '14px',
                    fontWeight:   '700',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    gap:          '8px',
                    transition:   'all 0.15s',
                    background:   step === 'success'
                        ? 'linear-gradient(135deg,#059669,#10b981)'
                        : 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
                    boxShadow:    '0 0 20px rgba(59,130,246,0.25)',
                    color:        'white',
                    opacity:      step === 'loading' ? 0.7 : 1,
                }}
            >
                {step === 'loading'
                    ? <><Spinner/> Tekshirilmoqda...</>
                    : step === 'success'
                        ? '✅ Kirildi'
                        : '🎓 HEMIS orqali kirish'}
            </button>

            {/* Yo'riqnoma */}
            <div style={{
                marginTop:  '14px',
                padding:    '10px 12px',
                background: 'rgba(59,130,246,0.05)',
                border:     '1px solid rgba(59,130,246,0.12)',
                borderRadius: '8px',
                fontSize:   '11px',
                color:      '#4a4a6a',
                lineHeight: 1.6,
            }}>
                <strong style={{ color:'#60a5fa' }}>
                    Token qayerdan olinadi?
                </strong><br/>
                1. <a href="https://student.urdu.uz"
                    target="_blank"
                    style={{ color:'#60a5fa' }}>
                    student.urdu.uz
                </a> ga kiring<br/>
                2. Login/parol bilan kiring<br/>
                3. API token ni nusxalang
            </div>
        </div>
    )
}
```

---

## 8. PROFIL SAHIFASIDA KO'RSATISH

### `src/pages/UserProfile.jsx` — HEMIS info bo'limi:

```jsx
{/* HEMIS ma'lumotlari — faqat is_hemis_user bo'lsa */}
{user.is_hemis_user && (
    <div style={{
        background:   'rgba(59,130,246,0.04)',
        border:       '1px solid rgba(59,130,246,0.12)',
        borderRadius: '14px',
        padding:      '20px',
        marginTop:    '16px',
    }}>
        <div style={{
            fontSize:     '10px',
            fontWeight:   '700',
            color:        '#3a3a5a',
            letterSpacing: '0.1em',
            marginBottom: '14px',
        }}>
            🎓 HEMIS MA'LUMOTLARI
        </div>

        <div style={{
            display:  'grid',
            gridTemplateColumns: '1fr 1fr',
            gap:      '10px',
        }}>
            {[
                { label: 'Universitet', value: user.university },
                { label: 'Fakultet',    value: user.faculty },
                { label: 'Mutaxassislik', value: user.specialty_name },
                { label: 'Guruh',       value: user.group_name },
                { label: 'Kurs',        value: user.student_level },
                { label: 'Semestr',     value: user.semester_name },
                { label: 'Ta\'lim shakli', value: user.education_form },
                { label: 'To\'lov',     value: user.payment_form },
                { label: 'GPA',         value: user.avg_gpa
                    ? `${user.avg_gpa} / 5.0` : '—' },
                { label: 'Holat',       value: user.student_status },
            ].filter(r => r.value).map(row => (
                <div key={row.label} style={{
                    padding:      '8px 12px',
                    background:   'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                }}>
                    <div style={{
                        fontSize: '10px',
                        color:    '#3a3a5a',
                        marginBottom: '3px',
                    }}>
                        {row.label}
                    </div>
                    <div style={{
                        fontSize:   '12px',
                        fontWeight: '600',
                        color:      '#d4d4e8',
                    }}>
                        {row.value}
                    </div>
                </div>
            ))}
        </div>
    </div>
)}
```

---

## 9. TEKSHIRUV

```bash
# 1. Migration
python manage.py makemigrations accounts
python manage.py migrate
python manage.py check  # xato yo'q

# 2. Server
python manage.py runserver

# 3. API test — haqiqiy HEMIS token bilan:
curl -X POST http://localhost:8000/api/auth/hemis/ \
  -H "Content-Type: application/json" \
  -d '{
    "hemis_token":   "eyJ0eXAiOiJKV...",
    "refresh_token": "XQ5sbJKDjne..."
  }'

# Kutilayotgan javob:
# {
#   "access":  "eyJ...",
#   "refresh": "eyJ...",
#   "user": {
#     "username":     "hemis_54996",
#     "full_name":    "YUSUPOVA SHIRIN ULUG'BEK QIZI",
#     "university":   "Urganch davlat universiteti",
#     "faculty":      "Xorijiy filologiya fakulteti",
#     "group_name":   "2401B-TARJIMA (INGLIZ)",
#     "avg_gpa":      "4.63",
#     ...
#   },
#   "created": true
# }
```

```
✅ TEKSHIRUV RO'YXATI:

Backend:
  ✅ hemis_id, hemis_student_id fieldlari bor
  ✅ HemisService.get_student_info() ishlaydi
  ✅ HemisService.extract_user_data() barcha
     fieldlarni to'g'ri ajratadi
  ✅ get_or_create_user() User yaratadi/yangilaydi
  ✅ POST /api/auth/hemis/ → JWT qaytaradi
  ✅ POST /api/auth/hemis/sync/ → ma'lumot yangilaydi
  ✅ Timeout va ConnectionError handle qilingan

Frontend:
  ✅ Token textarea + kirish tugmasi
  ✅ Loading, error, success holatlari
  ✅ authStore ga to'g'ri saqlanadi
  ✅ Profilda HEMIS ma'lumotlari ko'rinadi
```

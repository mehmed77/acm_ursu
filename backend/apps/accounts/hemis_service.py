"""
HEMIS Student API bilan ishlash service.

Talaba login/parol → HEMIS token → /account/me → User yaratish/yangilash.
Hash orqali faqat o'zgangan ma'lumotlarni update qiladi.
"""

import hashlib
import json
import logging
from datetime import date

import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

HEMIS_BASE_URL = getattr(settings, 'HEMIS_BASE_URL', 'https://student.urdu.uz')
HEMIS_LOGIN_URL = f'{HEMIS_BASE_URL}/rest/v1/auth/login'
HEMIS_ME_URL = f'{HEMIS_BASE_URL}/rest/v1/account/me'
REQUEST_TIMEOUT = 15


class HemisService:
    """HEMIS Student API bilan ishlash."""

    # ──────────────────────────────────────────────────────
    #  1. Login/parol bilan HEMIS dan token olish
    # ──────────────────────────────────────────────────────
    @staticmethod
    def login_with_credentials(login: str, password: str) -> dict:
        """
        HEMIS login/parol bilan autentifikatsiya.

        Returns:
            {'success': True,  'token': '...', 'refresh_token': '...'}
            {'success': False, 'error': '...'}
        """
        try:
            resp = requests.post(
                HEMIS_LOGIN_URL,
                json={'login': login, 'password': password},
                headers={'Accept': 'application/json'},
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code != 200:
                return {
                    'success': False,
                    'error': "HEMIS login yoki parol noto'g'ri",
                }

            data = resp.json()

            if not data.get('success') or not data.get('data', {}).get('token'):
                return {
                    'success': False,
                    'error': data.get('error') or "HEMIS autentifikatsiya xatosi",
                }

            return {
                'success': True,
                'token': data['data']['token'],
                'refresh_token': data['data'].get('refresh_token', ''),
            }

        except requests.Timeout:
            logger.error('HEMIS login timeout')
            return {'success': False, 'error': 'HEMIS server javob bermadi'}
        except requests.ConnectionError:
            logger.error('HEMIS login ulanish xatosi')
            return {'success': False, 'error': "HEMIS serverga ulanib bo'lmadi"}
        except Exception as exc:
            logger.exception('HEMIS login kutilmagan xato: %s', exc)
            return {'success': False, 'error': 'Kutilmagan xato yuz berdi'}

    # ──────────────────────────────────────────────────────
    #  2. Token bilan talaba ma'lumotini olish
    # ──────────────────────────────────────────────────────
    @staticmethod
    def get_student_info(hemis_token: str) -> dict:
        """
        HEMIS tokenini ishlatib talaba ma'lumotini oladi.

        Returns:
            {'success': True,  'data': {...}}
            {'success': False, 'error': '...', 'code': int}
        """
        try:
            resp = requests.get(
                HEMIS_ME_URL,
                headers={
                    'Authorization': f'Bearer {hemis_token}',
                    'Accept': 'application/json',
                },
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code == 401:
                return {
                    'success': False,
                    'error': "HEMIS token noto'g'ri yoki eskirgan",
                    'code': 401,
                }

            if resp.status_code != 200:
                logger.warning('HEMIS API %s qaytardi', resp.status_code)
                return {
                    'success': False,
                    'error': f'HEMIS API xatosi: {resp.status_code}',
                    'code': resp.status_code,
                }

            body = resp.json()

            if not body.get('success'):
                return {
                    'success': False,
                    'error': body.get('error') or 'HEMIS xatosi',
                }

            return {'success': True, 'data': body['data']}

        except requests.Timeout:
            logger.error('HEMIS API timeout')
            return {'success': False, 'error': 'HEMIS server javob bermadi'}
        except requests.ConnectionError:
            logger.error('HEMIS API ulanish xatosi')
            return {'success': False, 'error': "HEMIS serverga ulanib bo'lmadi"}
        except Exception as exc:
            logger.exception('HEMIS kutilmagan xato: %s', exc)
            return {'success': False, 'error': 'Kutilmagan xato yuz berdi'}

    # ──────────────────────────────────────────────────────
    #  3. HEMIS response dan hash hisoblash
    # ──────────────────────────────────────────────────────
    @staticmethod
    def compute_hash(hemis_data: dict) -> str:
        """HEMIS /account/me javobidan barqaror hash hisoblaydi."""
        # Faqat muhim fieldlarni olish (token, session kabi o'zgaruvchanlarni olib tashlash)
        stable = json.dumps(hemis_data, sort_keys=True, ensure_ascii=False, default=str)
        return hashlib.md5(stable.encode('utf-8')).hexdigest()

    # ──────────────────────────────────────────────────────
    #  4. API javobidan ma'lumotlarni ajratib olish
    # ──────────────────────────────────────────────────────
    @staticmethod
    def extract_user_data(hemis_data: dict) -> dict:
        """HEMIS /account/me javobidan kerakli ma'lumotlarni ajratadi."""

        # Tug'ilgan sana: unix timestamp → date
        birth_date = None
        bd_ts = hemis_data.get('birth_date')
        if bd_ts:
            try:
                birth_date = date.fromtimestamp(int(bd_ts))
            except (ValueError, TypeError, OSError):
                pass

        def _nested(key, field='name'):
            obj = hemis_data.get(key)
            if isinstance(obj, dict):
                return obj.get(field, '')
            return ''

        def _nested_id(key):
            obj = hemis_data.get(key)
            if isinstance(obj, dict):
                raw = obj.get('id')
                if raw is not None:
                    try:
                        return int(raw)
                    except (ValueError, TypeError):
                        pass
            return None

        return {
            'hemis_id': hemis_data.get('id'),
            'hemis_student_id': str(hemis_data.get('student_id_number', '') or ''),
            'full_name': hemis_data.get('full_name', '') or '',
            'first_name': (hemis_data.get('first_name', '') or '').title(),
            'last_name': (hemis_data.get('second_name', '') or '').title(),
            'email': hemis_data.get('email', '') or '',
            'phone': hemis_data.get('phone', '') or '',
            'birth_date': birth_date,
            'passport_pin': hemis_data.get('passport_pin', '') or '',
            'avatar_url': hemis_data.get('image', '') or '',
            'gender': _nested('gender'),
            'university': hemis_data.get('university', '') or '',
            'faculty': _nested('faculty'),
            'faculty_id': _nested_id('faculty'),
            'specialty_name': _nested('specialty'),
            'specialty_code': _nested('specialty', 'code'),
            'group_name': _nested('group'),
            'group_id': _nested_id('group'),
            'education_level': _nested('educationType'),
            'education_form': _nested('educationForm'),
            'payment_form': _nested('paymentForm'),
            'student_level': _nested('level'),
            'semester_name': _nested('semester'),
            'education_lang': _nested('educationLang'),
            'student_status': _nested('studentStatus'),
            'avg_gpa': hemis_data.get('avg_gpa') or None,
            'country': _nested('country'),
            'province': _nested('province'),
            'district': _nested('district'),
            'address': hemis_data.get('address', '') or '',
            'accommodation': _nested('accommodation'),
            'social_category': _nested('socialCategory'),
        }

    # ──────────────────────────────────────────────────────
    #  5. User topish yoki yaratish + hash bilan smart update
    # ──────────────────────────────────────────────────────
    @staticmethod
    def get_or_create_user(hemis_data: dict, hemis_token: str, hemis_refresh: str = ''):
        """
        HEMIS ma'lumotlari asosida User topadi yoki yaratadi.
        Faqat hash o'zgargan bo'lsa ma'lumotlarni yangilaydi.

        Returns: (user, created: bool)
        """
        from apps.accounts.models import User, UserProfile

        extracted = HemisService.extract_user_data(hemis_data)
        hemis_id = extracted['hemis_id']
        email = extracted['email']
        new_hash = HemisService.compute_hash(hemis_data)

        # 1 — hemis_id bo'yicha qidirish
        user = User.objects.filter(hemis_id=hemis_id).first()

        # 2 — Email bo'yicha (mavjud oddiy user HEMIS ga ulanishi mumkin)
        if not user and email:
            user = User.objects.filter(email=email).first()

        created = False

        if not user:
            # Yangi user yaratish
            base_username = f'hemis_{hemis_id}'
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f'{base_username}_{counter}'
                counter += 1

            user = User(username=username, is_hemis_user=True)
            user.set_unusable_password()
            created = True
            logger.info('✅ Yangi HEMIS user: %s (hemis_id=%s)', username, hemis_id)

        # ── Token har doim yangilanadi ──
        user.hemis_id = hemis_id
        user.hemis_token = hemis_token
        user.hemis_refresh = hemis_refresh
        user.hemis_synced_at = timezone.now()
        user.is_hemis_user = True

        # ── Ma'lumotlar faqat hash o'zgargan bo'lsa yangilanadi ──
        if created or user.hemis_data_hash != new_hash:
            logger.info(
                '🔄 HEMIS data yangilanmoqda: %s (hash: %s → %s)',
                user.username, user.hemis_data_hash[:8] if user.hemis_data_hash else 'none', new_hash[:8],
            )

            user.hemis_student_id = extracted['hemis_student_id']
            user.first_name = extracted['first_name']
            user.last_name = extracted['last_name']
            user.full_name = extracted['full_name']
            user.phone = extracted['phone']
            user.gender = extracted['gender']
            user.avatar_url = extracted['avatar_url']
            user.passport_pin = extracted['passport_pin']
            user.address = extracted['address']

            if extracted['birth_date']:
                user.birth_date = extracted['birth_date']

            if extracted['avg_gpa'] is not None:
                try:
                    user.avg_gpa = extracted['avg_gpa']
                except (ValueError, TypeError):
                    pass

            if email and not User.objects.filter(email=email).exclude(pk=user.pk).exists():
                user.email = email

            user.university = extracted['university']
            user.faculty = extracted['faculty']
            user.faculty_id = extracted['faculty_id']
            user.specialty_name = extracted['specialty_name']
            user.specialty_code = extracted['specialty_code']
            user.group_name = extracted['group_name']
            user.group_id = extracted['group_id']
            user.education_level = extracted['education_level']
            user.education_form = extracted['education_form']
            user.payment_form = extracted['payment_form']
            user.student_level = extracted['student_level']
            user.semester_name = extracted['semester_name']
            user.education_lang = extracted['education_lang']
            user.student_status = extracted['student_status']
            user.country = extracted['country']
            user.province = extracted['province']
            user.district = extracted['district']
            user.accommodation = extracted['accommodation']
            user.social_category = extracted['social_category']

            user.hemis_data_hash = new_hash
        else:
            logger.info('⏩ HEMIS data o\'zgarmagan: %s (hash: %s)', user.username, new_hash[:8])

        user.save()

        # UserProfile yaratish (agar yo'q bo'lsa)
        UserProfile.objects.get_or_create(user=user)

        return user, created

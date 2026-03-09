from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model with rating, solved count and HEMIS integration."""

    email = models.EmailField(unique=True)
    rating = models.IntegerField(default=0)
    max_rating = models.IntegerField(default=0)
    solved_count = models.IntegerField(default=0)

    # ─── HEMIS identifikatsiya ───────────────────────────
    hemis_id = models.IntegerField(
        unique=True, null=True, blank=True,
        db_index=True,
        help_text='HEMIS tizimidagi talaba ID (integer)',
    )
    hemis_student_id = models.CharField(
        max_length=50, null=True, blank=True,
        help_text='student_id_number (masalan 341241105193)',
    )
    hemis_token = models.TextField(
        null=True, blank=True,
        help_text='HEMIS JWT token',
    )
    hemis_refresh = models.TextField(
        null=True, blank=True,
        help_text='HEMIS refresh token',
    )
    hemis_token_exp = models.DateTimeField(
        null=True, blank=True,
        help_text='Token eskirish vaqti',
    )

    # ─── Shaxsiy ma'lumotlar ─────────────────────────────
    full_name = models.CharField(max_length=200, blank=True)
    passport_pin = models.CharField(max_length=20, null=True, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    gender = models.CharField(max_length=10, blank=True)
    avatar_url = models.URLField(max_length=500, blank=True)

    # ─── Universitet ma'lumotlari ────────────────────────
    university = models.CharField(max_length=200, blank=True)

    faculty = models.CharField(max_length=200, blank=True)
    faculty_id = models.IntegerField(
        null=True, blank=True,
        help_text='HEMIS dagi fakultet ID',
    )

    specialty_name = models.CharField(max_length=200, blank=True)
    specialty_code = models.CharField(max_length=20, blank=True)

    group_name = models.CharField(max_length=100, blank=True)
    group_id = models.IntegerField(
        null=True, blank=True,
        help_text='HEMIS dagi guruh ID',
    )

    education_level = models.CharField(
        max_length=50, blank=True,
        help_text='Bakalavr / Magistr',
    )
    education_form = models.CharField(
        max_length=50, blank=True,
        help_text='Kunduzgi / Sirtqi',
    )
    payment_form = models.CharField(
        max_length=50, blank=True,
        help_text='Shartnoma / Grant',
    )
    student_level = models.CharField(
        max_length=20, blank=True,
        help_text='1-kurs, 2-kurs ...',
    )
    semester_name = models.CharField(max_length=20, blank=True)
    avg_gpa = models.DecimalField(
        max_digits=4, decimal_places=2,
        null=True, blank=True,
    )
    student_status = models.CharField(
        max_length=50, blank=True,
        help_text="O'qimoqda / Akademik ta'til ...",
    )
    education_lang = models.CharField(max_length=50, blank=True)

    # ─── Manzil ──────────────────────────────────────────
    country = models.CharField(max_length=50, blank=True)
    province = models.CharField(max_length=100, blank=True)
    district = models.CharField(max_length=100, blank=True)
    address = models.CharField(max_length=300, blank=True)

    # ─── Ijtimoiy ────────────────────────────────────────
    accommodation = models.CharField(
        max_length=100, blank=True,
        help_text="Yotoqxona / O'z uyi ...",
    )
    social_category = models.CharField(max_length=100, blank=True)

    # ─── Meta ────────────────────────────────────────────
    hemis_synced_at = models.DateTimeField(
        null=True, blank=True,
        help_text='HEMIS dan oxirgi sinc vaqti',
    )
    is_hemis_user = models.BooleanField(
        default=False,
        help_text="HEMIS orqali ro'yxatdan o'tgan",
    )
    hemis_data_hash = models.CharField(
        max_length=64, blank=True,
        help_text='HEMIS response hash — faqat o\'zgarganda update qilish uchun',
    )

    class Meta:
        ordering = ['-rating']
        indexes = [
            models.Index(fields=['hemis_id']),
        ]

    def __str__(self):
        return self.username

    @property
    def rank_title(self) -> str:
        from apps.contests.models import get_rank_title
        return get_rank_title(self.rating)

    @property
    def rank_color(self) -> str:
        from apps.contests.models import get_rank_color
        return get_rank_color(self.rating)


class UserProfile(models.Model):
    """Extended user profile information."""

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='profile',
    )
    bio = models.TextField(max_length=500, blank=True)
    avatar = models.ImageField(
        upload_to='avatars/', blank=True, null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} profili"

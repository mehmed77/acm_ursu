from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserProfile


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        'username', 'email', 'rating', 'solved_count',
        'is_hemis_user', 'is_staff',
    )
    list_filter = ('is_staff', 'is_active', 'is_hemis_user')
    search_fields = ('username', 'email', 'full_name', 'hemis_student_id')
    inlines = (UserProfileInline,)

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Online Judge', {
            'fields': ('rating', 'max_rating', 'solved_count'),
        }),
        ('HEMIS — Identifikatsiya', {
            'fields': (
                'is_hemis_user', 'hemis_id', 'hemis_student_id',
                'hemis_synced_at',
            ),
            'classes': ('collapse',),
        }),
        ('HEMIS — Shaxsiy', {
            'fields': (
                'full_name', 'phone', 'gender', 'birth_date',
                'passport_pin', 'avatar_url',
            ),
            'classes': ('collapse',),
        }),
        ('HEMIS — Ta\'lim', {
            'fields': (
                'university', 'faculty', 'faculty_id',
                'specialty_name', 'specialty_code',
                'group_name', 'group_id',
                'education_level', 'education_form', 'payment_form',
                'student_level', 'semester_name', 'avg_gpa',
                'student_status', 'education_lang',
            ),
            'classes': ('collapse',),
        }),
        ('HEMIS — Manzil / Ijtimoiy', {
            'fields': (
                'country', 'province', 'district', 'address',
                'accommodation', 'social_category',
            ),
            'classes': ('collapse',),
        }),
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at')
    search_fields = ('user__username',)

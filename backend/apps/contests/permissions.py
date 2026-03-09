from rest_framework import permissions
from django.utils import timezone


class IsContestStarted(permissions.BasePermission):
    """Kontest boshlanganini tekshirish. Masalalar faqat shunda ko'rinadi."""
    message = "Kontest hali boshlanmagan."

    def has_object_permission(self, request, view, obj):
        return obj.has_started


class IsContestParticipant(permissions.BasePermission):
    """Foydalanuvchi kontestga ro'yxatdan o'tganini tekshirish."""
    message = "Avval kontestga ro'yxatdan o'ting."

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        return obj.registrations.filter(user=request.user).exists()

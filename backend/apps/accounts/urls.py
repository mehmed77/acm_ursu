from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView,
    LoginView,
    ProfileView,
    HemisSyncView,
    TelegramLinkInitView,
    TelegramWebhookView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

urlpatterns = [
    path('register/',      RegisterView.as_view(),      name='auth-register'),
    path('login/',         LoginView.as_view(),          name='auth-login'),
    path('token/refresh/', TokenRefreshView.as_view(),   name='auth-token-refresh'),
    path('profile/',       ProfileView.as_view(),        name='auth-profile'),

    # HEMIS sync
    path('hemis/sync/',    HemisSyncView.as_view(),      name='hemis-sync'),

    # Telegram bog'lash
    path('telegram/link/',    TelegramLinkInitView.as_view(), name='telegram-link-init'),
    path('telegram/webhook/', TelegramWebhookView.as_view(),  name='telegram-webhook'),

    # Parolni tiklash
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]

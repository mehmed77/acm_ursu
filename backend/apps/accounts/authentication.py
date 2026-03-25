"""
Cookie-based JWT authentication.

Reads the access token from the 'access_token' httpOnly cookie first,
then falls back to the standard Authorization header so that DRF browsable
API and existing tooling (curl, Postman) continue to work.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        raw_token = request.COOKIES.get('access_token')
        if raw_token is None:
            # Fall back to "Authorization: Bearer ..." header
            return super().authenticate(request)

        try:
            validated_token = self.get_validated_token(raw_token)
        except TokenError:
            # Cookie tokeni eskirgan yoki noto'g'ri — anonim foydalanuvchi sifatida
            # davom etamiz. AllowAny view'lar (login, register) ishlashda davom etadi.
            # IsAuthenticated view'lar keyin 401 qaytaradi (to'g'ri xatti-harakat).
            return None

        return self.get_user(validated_token), validated_token

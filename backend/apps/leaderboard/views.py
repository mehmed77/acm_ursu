from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny


def _display_name(user):
    """HEMIS full_name yoki first_name/last_name dan to'liq ism."""
    full = getattr(user, 'full_name', '') or ''
    if full.strip():
        return full.strip()
    parts = [
        (getattr(user, 'last_name',  '') or '').strip(),
        (getattr(user, 'first_name', '') or '').strip(),
    ]
    return ' '.join(p for p in parts if p)


class LeaderboardView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from apps.accounts.models import User

        page     = int(request.query_params.get('page', 1))
        per_page = 20
        offset   = (page - 1) * per_page

        users = User.objects.filter(
            is_active=True
        ).order_by(
            '-rating', '-solved_count', 'username'
        )

        total = users.count()
        users = users[offset: offset + per_page]

        data = []
        for i, u in enumerate(users, start=offset + 1):
            data.append({
                'rank':         i,
                'username':     u.username,
                'display_name': _display_name(u),
                'rating':       getattr(u, 'rating', 0) or 0,
                'solved_count': getattr(u, 'solved_count', 0) or 0,
                'max_rating':   getattr(u, 'max_rating',
                                  getattr(u, 'rating', 0)) or 0,
            })

        return Response({
            'results':     data,
            'count':       total,
            'page':        page,
            'total_pages': (total + per_page - 1) // per_page,
        })

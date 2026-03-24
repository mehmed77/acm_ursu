from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import UserRating
from .services import get_rank_title
from apps.submissions.models import Submission
from apps.contests.models import ContestParticipant

User = get_user_model()


class LeaderboardSerializer(serializers.ModelSerializer):
    """Global reyting ro'yxati."""
    username     = serializers.CharField(source='user.username')
    display_name = serializers.SerializerMethodField()
    solved_count = serializers.IntegerField(source='user.solved_count')
    country      = serializers.SerializerMethodField()
    rank_title   = serializers.SerializerMethodField()
    rank_color   = serializers.SerializerMethodField()

    class Meta:
        model = UserRating
        fields = (
            'rank', 'username', 'display_name',
            'rating', 'max_rating',
            'rank_title', 'rank_color',
            'solved_count', 'country',
        )

    def get_display_name(self, obj):
        u = obj.user
        # HEMIS users store full name in full_name field
        if getattr(u, 'full_name', ''):
            return u.full_name.strip()
        # Regular users have first_name / last_name (Django AbstractUser)
        parts = [u.last_name, u.first_name]
        name = ' '.join(p for p in parts if p)
        return name.strip()

    def get_country(self, obj):
        if hasattr(obj.user, 'profile'):
            return obj.user.profile.country
        return ''

    def get_rank_title(self, obj):
        return get_rank_title(obj.rating)['title']

    def get_rank_color(self, obj):
        return get_rank_title(obj.rating)['color']


class UserSubmissionHistorySerializer(serializers.ModelSerializer):
    """Foydalanuvchi submission tarixi (qisqa)."""
    problem_title = serializers.CharField(source='problem.title')
    problem_slug = serializers.CharField(source='problem.slug')
    language_display = serializers.CharField(source='get_language_display')
    status_display = serializers.CharField(source='get_status_display')

    class Meta:
        model = Submission
        fields = (
            'id', 'problem_title', 'problem_slug',
            'language_display', 'status', 'status_display',
            'time_used', 'memory_used', 'created_at',
        )


class UserContestHistorySerializer(serializers.ModelSerializer):
    """Foydalanuvchi kontest tarixi."""
    contest_title = serializers.CharField(source='contest.title')
    contest_slug = serializers.CharField(source='contest.slug')

    class Meta:
        model = ContestParticipant
        fields = (
            'contest_title', 'contest_slug',
            'score', 'penalty', 'registered_at',
        )


class PublicProfileSerializer(serializers.ModelSerializer):
    """Foydalanuvchi public profili."""
    rating = serializers.SerializerMethodField()
    max_rating = serializers.SerializerMethodField()
    rank = serializers.SerializerMethodField()
    rank_title = serializers.SerializerMethodField()
    rank_color = serializers.SerializerMethodField()
    country = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    recent_submissions = serializers.SerializerMethodField()
    solved_problems = serializers.SerializerMethodField()
    contest_history = serializers.SerializerMethodField()
    rating_history = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email',
            'rating', 'max_rating', 'rank', 'rank_title', 'rank_color',
            'solved_count', 'country', 'bio', 'avatar',
            'recent_submissions', 'solved_problems',
            'contest_history', 'rating_history',
            'date_joined',
        )

    def _get_user_rating(self, obj):
        if not hasattr(obj, '_cached_rating'):
            try:
                obj._cached_rating = obj.user_rating
            except UserRating.DoesNotExist:
                obj._cached_rating = None
        return obj._cached_rating

    def get_rating(self, obj):
        ur = self._get_user_rating(obj)
        return ur.rating if ur else 1200

    def get_max_rating(self, obj):
        ur = self._get_user_rating(obj)
        return ur.max_rating if ur else 1200

    def get_rank(self, obj):
        ur = self._get_user_rating(obj)
        return ur.rank if ur else 0

    def get_rank_title(self, obj):
        return get_rank_title(self.get_rating(obj))['title']

    def get_rank_color(self, obj):
        return get_rank_title(self.get_rating(obj))['color']

    def get_country(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.country
        return ''

    def get_bio(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.bio
        return ''

    def get_avatar(self, obj):
        if hasattr(obj, 'profile') and obj.profile.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile.avatar.url)
        return None

    def get_recent_submissions(self, obj):
        """Oxirgi 20 ta submission."""
        submissions = Submission.objects.filter(
            user=obj,
        ).select_related('problem')[:20]
        return UserSubmissionHistorySerializer(submissions, many=True).data

    def get_solved_problems(self, obj):
        """Yechilgan masalalar ro'yxati (slug va title)."""
        solved = Submission.objects.filter(
            user=obj,
            status='accepted',
        ).values(
            'problem__slug', 'problem__title', 'problem__difficulty',
        ).distinct()
        return [
            {
                'slug': s['problem__slug'],
                'title': s['problem__title'],
                'difficulty': s['problem__difficulty'],
            }
            for s in solved
        ]

    def get_contest_history(self, obj):
        """Kontest tarixi."""
        participations = ContestParticipant.objects.filter(
            user=obj,
        ).select_related('contest').order_by('-contest__start_time')
        return UserContestHistorySerializer(participations, many=True).data

    def get_rating_history(self, obj):
        """
        Rating dinamikasi (grafik uchun).
        Rated kontestlardagi rating o'zgarishlari.
        """
        participations = ContestParticipant.objects.filter(
            user=obj,
            contest__is_rated=True,
        ).select_related('contest').order_by('contest__end_time')

        history = []
        for p in participations:
            history.append({
                'contest': p.contest.title,
                'contest_slug': p.contest.slug,
                'date': p.contest.end_time,
                'score': p.score,
                'penalty': p.penalty,
            })
        return history

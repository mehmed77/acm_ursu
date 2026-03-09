from rest_framework import serializers
from .models import Submission


class SubmissionCreateSerializer(serializers.ModelSerializer):
    """Yangi submission yaratish uchun."""

    class Meta:
        model = Submission
        fields = ('id', 'problem', 'language', 'code')

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class SubmissionResultSerializer(serializers.ModelSerializer):
    """Polling uchun — barcha fieldlar, null-safe."""
    problem_slug = serializers.CharField(source='problem.slug', read_only=True)
    problem_title = serializers.CharField(source='problem.title', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    language_display = serializers.CharField(source='get_language_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    failed_test = serializers.SerializerMethodField()

    class Meta:
        model = Submission
        fields = (
            'id',
            'problem', 'problem_slug', 'problem_title',
            'username',
            'language', 'language_display',
            'code', 'run_type',
            'status', 'status_display',
            'time_used', 'memory_used',
            'error_message',
            'failed_test', 'extra_data',
            'created_at',
        )

    def get_failed_test(self, obj):
        if not obj.failed_test_number:
            return None
        return {
            'number': obj.failed_test_number,
            'input': obj.failed_test_input,
            'expected': obj.failed_test_expected,
            'actual': obj.failed_test_actual,
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['time_used'] = data.get('time_used') or 0
        data['memory_used'] = data.get('memory_used') or 0
        data['status'] = (data.get('status') or 'pending').upper()
        return data


class SubmissionListSerializer(serializers.ModelSerializer):
    """Submissions history uchun (kodsiz)."""
    problem_slug = serializers.CharField(source='problem.slug', read_only=True)
    problem_title = serializers.CharField(source='problem.title', read_only=True)
    language_display = serializers.CharField(source='get_language_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Submission
        fields = (
            'id',
            'problem_slug', 'problem_title',
            'language', 'language_display',
            'status', 'status_display',
            'run_type',
            'time_used', 'memory_used',
            'created_at',
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['time_used'] = data.get('time_used') or 0
        data['memory_used'] = data.get('memory_used') or 0
        data['status'] = (data.get('status') or 'pending').upper()
        return data


class SubmissionCodeSerializer(serializers.ModelSerializer):
    """Submission kodini ko'rish uchun (modal)."""
    problem_title = serializers.CharField(source='problem.title', read_only=True)
    problem_slug = serializers.CharField(source='problem.slug', read_only=True)
    failed_test = serializers.SerializerMethodField()

    class Meta:
        model = Submission
        fields = (
            'id', 'problem_title', 'problem_slug',
            'language', 'code', 'run_type',
            'status', 'time_used', 'memory_used',
            'error_message', 'failed_test', 'extra_data', 'created_at',
        )

    def get_failed_test(self, obj):
        if not obj.failed_test_number:
            return None
        return {
            'number': obj.failed_test_number,
            'input': obj.failed_test_input,
            'expected': obj.failed_test_expected,
            'actual': obj.failed_test_actual,
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['time_used'] = data.get('time_used') or 0
        data['memory_used'] = data.get('memory_used') or 0
        data['status'] = (data.get('status') or 'pending').upper()
        return data

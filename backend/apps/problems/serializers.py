from rest_framework import serializers
from .models import Problem, TestCase, Tag, ProblemComment, ProblemRating


class TagSerializer(serializers.ModelSerializer):
    problem_count = serializers.IntegerField(
        read_only=True, default=0
    )

    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug', 'problem_count']
        read_only_fields = ['slug']

    def create(self, validated_data):
        from django.utils.text import slugify
        validated_data['slug'] = slugify(
            validated_data['name']
        )
        return super().create(validated_data)


class TestCaseSerializer(serializers.ModelSerializer):
    """Faqat sample test caselar uchun (foydalanuvchiga ko'rinadigan)."""
    input = serializers.CharField(source='input_data', read_only=True)

    class Meta:
        model = TestCase
        fields = ('id', 'input', 'input_data', 'expected_output', 'file_number', 'created_at')


class ProblemListSerializer(serializers.ModelSerializer):
    """Masalalar ro'yxati uchun (qisqa)."""
    tags = TagSerializer(many=True, read_only=True)
    author = serializers.StringRelatedField()
    acceptance_rate = serializers.SerializerMethodField()
    user_status = serializers.SerializerMethodField()
    accepted_count = serializers.SerializerMethodField()
    total_submissions = serializers.SerializerMethodField()

    class Meta:
        model = Problem
        fields = (
            'id', 'title', 'slug', 'difficulty',
            'time_limit', 'memory_limit',
            'tags', 'author', 'acceptance_rate',
            'user_status', 'accepted_count', 'total_submissions', 'created_at',
        )

    def get_acceptance_rate(self, obj):
        from apps.submissions.models import Submission
        total = obj.submissions.filter(run_type='submit').count()
        if total == 0:
            return None
        accepted = obj.submissions.filter(run_type='submit', status='accepted').count()
        return round(accepted / total * 100, 1)

    def get_user_status(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 'none'
        
        from apps.submissions.models import Submission
        subs = Submission.objects.filter(problem=obj, user=request.user, run_type='submit')
        if not subs.exists():
            return 'none'
        if subs.filter(status='accepted').exists():
            return 'accepted'
        return 'attempted'

    def get_accepted_count(self, obj):
        from apps.submissions.models import Submission
        return obj.submissions.filter(run_type='submit', status='accepted').count()

    def get_total_submissions(self, obj):
        from apps.submissions.models import Submission
        return obj.submissions.filter(run_type='submit').count()


class ProblemDetailSerializer(serializers.ModelSerializer):
    """Masala batafsil ko'rish uchun (sample test caselar bilan)."""
    tags = TagSerializer(many=True, read_only=True)
    author = serializers.StringRelatedField()
    sample_test_cases = serializers.SerializerMethodField()
    acceptance_rate = serializers.SerializerMethodField()
    total_submissions = serializers.SerializerMethodField()
    accepted_submissions = serializers.SerializerMethodField()

    class Meta:
        model = Problem
        fields = (
            'id', 'title', 'slug', 'description',
            'input_format', 'output_format',
            'difficulty', 'time_limit', 'memory_limit',
            'tags', 'author', 'sample_test_cases',
            'acceptance_rate', 'total_submissions', 'accepted_submissions',
            'created_at',
        )

    def get_sample_test_cases(self, obj):
        """Faqat is_sample=True test caselarni qaytaradi."""
        samples = obj.test_cases.filter(is_sample=True).order_by('file_number', 'id')
        return TestCaseSerializer(samples, many=True).data

    def get_acceptance_rate(self, obj):
        from apps.submissions.models import Submission
        total = obj.submissions.count()
        if total == 0:
            return None
        accepted = obj.submissions.filter(status='accepted').count()
        return round(accepted / total * 100, 1)

    def get_total_submissions(self, obj):
        return obj.submissions.count()

    def get_accepted_submissions(self, obj):
        from apps.submissions.models import Submission
        return obj.submissions.filter(status='accepted').count()


class AdminTestCaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestCase
        fields = ['id', 'input_data', 'expected_output', 'is_sample', 'file_number', 'created_at']


class AdminProblemListSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    testcase_count = serializers.IntegerField(read_only=True, default=0)
    submission_count = serializers.IntegerField(read_only=True, default=0)
    acceptance_rate = serializers.SerializerMethodField()

    class Meta:
        model = Problem
        fields = [
            'id', 'title', 'slug', 'difficulty',
            'is_published', 'tags',
            'testcase_count', 'submission_count',
            'acceptance_rate', 'created_at',
        ]

    def get_acceptance_rate(self, obj):
        from apps.submissions.models import Submission
        total = Submission.objects.filter(
            problem=obj, run_type='submit'
        ).count()
        if not total:
            return None
        ac = Submission.objects.filter(
            problem=obj, run_type='submit',
            status='accepted'
        ).count()
        return round(ac / total * 100, 1)


class ProblemRatingStatsSerializer(serializers.Serializer):
    """Masala reytingi statistikasi."""
    average = serializers.FloatField()
    count = serializers.IntegerField()
    distribution = serializers.DictField(child=serializers.IntegerField())
    user_rating = serializers.IntegerField(allow_null=True)


class ProblemRatingWriteSerializer(serializers.ModelSerializer):
    """Foydalanuvchi reytingini yaratish/yangilash."""

    class Meta:
        model = ProblemRating
        fields = ('rating',)

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Reyting 1 dan 5 gacha bo'lishi kerak.")
        return value


class CommentAuthorSerializer(serializers.Serializer):
    """Minimal muallif ma'lumoti."""
    id = serializers.IntegerField()
    username = serializers.CharField()


class ProblemCommentSerializer(serializers.ModelSerializer):
    """Muhokama kommentariyasi (o'qish uchun)."""
    author = CommentAuthorSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = ProblemComment
        fields = (
            'id', 'author', 'content', 'comment_type',
            'like_count', 'is_liked', 'is_owner',
            'parent', 'replies', 'created_at', 'updated_at',
        )

    def get_replies(self, obj):
        if obj.parent is not None:
            return []
        qs = obj.replies.filter(is_hidden=False).order_by('created_at')
        return ProblemCommentSerializer(qs, many=True, context=self.context).data

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.likes.filter(user=request.user).exists()

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.author_id == request.user.id


class ProblemCommentWriteSerializer(serializers.ModelSerializer):
    """Yangi kommentariya yozish uchun."""

    class Meta:
        model = ProblemComment
        fields = ('content', 'comment_type', 'parent')

    def validate_content(self, value):
        value = value.strip()
        if len(value) < 5:
            raise serializers.ValidationError("Kommentariya kamida 5 belgidan iborat bo'lishi kerak.")
        return value

    def validate_parent(self, value):
        if value and value.parent is not None:
            raise serializers.ValidationError("Ikki darajali javobga javob berib bo'lmaydi.")
        return value


class AdminProblemDetailSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Tag.objects.all(),
        write_only=True, source='tags', required=False
    )
    testcases = TestCaseSerializer(
        source='test_cases', many=True, read_only=True
    )
    testcase_count = serializers.IntegerField(read_only=True, default=0)
    submission_count = serializers.IntegerField(read_only=True, default=0)
    file_testcase_count = serializers.SerializerMethodField()

    class Meta:
        model = Problem
        fields = [
            'id', 'title', 'slug',
            'description', 'input_format', 'output_format',
            'difficulty', 'time_limit', 'memory_limit',
            'is_published', 'tags', 'tag_ids',
            'testcases', 'testcase_count',
            'submission_count', 'file_testcase_count',
            'created_at',
        ]
        read_only_fields = ['slug', 'created_at']

    def get_file_testcase_count(self, obj):
        try:
            from apps.problems.testcase_loader import count_testcases
            return count_testcases(obj.slug)
        except Exception:
            return 0

    def create(self, validated_data):
        tags = validated_data.pop('tags', [])
        # Slug berilmagan bo'lsa - model auto-generate qiladi
        validated_data.pop('slug', None)
        problem = super().create(validated_data)
        problem.tags.set(tags)
        return problem

    def update(self, instance, validated_data):
        tags = validated_data.pop('tags', None)
        problem = super().update(instance, validated_data)
        if tags is not None:
            problem.tags.set(tags)
        return problem

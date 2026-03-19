from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator


class Tag(models.Model):
    """Masala teglar: dp, graph, greedy, ..."""
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True, blank=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Problem(models.Model):
    """Algoritmik masala."""

    class Difficulty(models.TextChoices):
        EASY = 'easy', 'Easy'
        MEDIUM = 'medium', 'Medium'
        HARD = 'hard', 'Hard'

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    description = models.TextField(help_text='Markdown formatida')
    input_format = models.TextField(help_text='Kirish formati tavsifi')
    output_format = models.TextField(help_text='Chiqish formati tavsifi')
    difficulty = models.CharField(
        max_length=10,
        choices=Difficulty.choices,
        default=Difficulty.EASY,
    )
    time_limit = models.FloatField(default=1.0, help_text='Sekundlarda')
    memory_limit = models.IntegerField(default=256, help_text='MB da')
    is_published = models.BooleanField(default=False)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='authored_problems',
    )
    tags = models.ManyToManyField(Tag, blank=True, related_name='problems')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # YANGI: Ball tizimi
    max_score = models.IntegerField(
        default  = 0,
        help_text = (
            '0 = ball tizimi yo\'q (ICPC uslubi). '
            '>0 = Codeforces uslubi (500, 1000, 1500...)'
        )
    )
    score_decay_rate = models.FloatField(
        default  = 0.5,
        help_text = (
            'Har daqiqada kamayish koeffitsienti. '
            'max_score * (1 - decay * vaqt)'
        )
    )
    wrong_penalty = models.IntegerField(
        default  = 50,
        help_text = 'Har noto\'g\'ri urinish uchun jarima (ball)'
    )

    class Meta:
        ordering = ['id']

    def calculate_score(
        self,
        minutes_elapsed: int,
        wrong_attempts:  int = 0
    ) -> int:
        """
        Codeforces uslubida ball hisoblash.

        Args:
            minutes_elapsed: yechishga ketgan vaqt (daqiqa)
            wrong_attempts:  noto'g'ri urinishlar soni

        Returns:
            Hisoblangan ball (minimum 0)
        """
        if self.max_score == 0:
            # Ball tizimi yo'q — ICPC uslubi
            return 1 if wrong_attempts == 0 else 0

        # Codeforces formula:
        # ball = max(3*max/10, max - max/250*t - 50*wrong)
        min_score    = max(3 * self.max_score // 10, 0)
        time_penalty = (self.max_score // 250) * minutes_elapsed
        wrong_pen    = self.wrong_penalty * wrong_attempts

        score = self.max_score - time_penalty - wrong_pen
        return max(min_score, score)

    def save(self, *args, **kwargs):
        if not self.slug:
            # Oxirgi problemani topib raqam berish
            last = Problem.objects.order_by('-id').first()
            
            if last and last.slug:
                import re
                match = re.search(r'\d+', last.slug)
                if match:
                    next_num = int(match.group()) + 1
                else:
                    next_num = 1
            else:
                next_num = 1
            
            # Format: A0001 ... A9999, keyin M0001 ...
            if next_num <= 9999:
                self.slug = f'A{next_num:04d}'
            else:
                self.slug = f'M{(next_num-9999):04d}'
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id}. {self.title}"


class ProblemRating(models.Model):
    """Foydalanuvchi masalani 1-5 yulduz bilan baholaydi."""
    problem = models.ForeignKey(
        Problem,
        on_delete=models.CASCADE,
        related_name='ratings',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='problem_ratings',
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('problem', 'user')

    def __str__(self):
        return f"{self.user} → {self.problem.slug}: {self.rating}★"


class ProblemComment(models.Model):
    """Masala bo'yicha muhokama kommentariyasi."""

    class CommentType(models.TextChoices):
        GENERAL  = 'general',  'Umumiy'
        QUESTION = 'question', 'Savol'
        FEEDBACK = 'feedback', 'Fikr-mulohaza'

    problem = models.ForeignKey(
        Problem,
        on_delete=models.CASCADE,
        related_name='comments',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='problem_comments',
    )
    content = models.TextField(max_length=2000)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies',
    )
    comment_type = models.CharField(
        max_length=10,
        choices=CommentType.choices,
        default=CommentType.GENERAL,
    )
    like_count = models.PositiveIntegerField(default=0)
    is_hidden = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-like_count', '-created_at']

    def __str__(self):
        return f"{self.author} on {self.problem.slug}"


class CommentLike(models.Model):
    """Foydalanuvchi kommentariyaga like bosishi."""
    comment = models.ForeignKey(
        ProblemComment,
        on_delete=models.CASCADE,
        related_name='likes',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comment_likes',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('comment', 'user')


class TestCase(models.Model):
    problem         = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name='test_cases')
    input_data      = models.TextField()
    expected_output = models.TextField()
    is_sample       = models.BooleanField(default=False)
    file_number     = models.IntegerField(null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['file_number', 'id']

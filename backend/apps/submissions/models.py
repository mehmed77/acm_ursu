from django.db import models
from django.conf import settings


class Submission(models.Model):
    """Foydalanuvchi yuborgan kod."""

    class Language(models.TextChoices):
        PYTHON     = 'python',     'Python 3.13'
        CPP        = 'cpp',        'GNU C++ 17'
        JAVA       = 'java',       'Java 17'
        CSHARP     = 'csharp',     'C# (.NET 8)'

    class Status(models.TextChoices):
        PENDING              = 'pending',              'Pending'
        RUNNING              = 'running',              'Running'
        ACCEPTED             = 'accepted',             'Accepted'
        WRONG_ANSWER         = 'wrong_answer',         'Wrong Answer'
        TIME_LIMIT_EXCEEDED  = 'time_limit_exceeded',  'Time Limit Exceeded'
        MEMORY_LIMIT_EXCEEDED = 'memory_limit_exceeded', 'Memory Limit Exceeded'
        RUNTIME_ERROR        = 'runtime_error',        'Runtime Error'
        COMPILATION_ERROR    = 'compilation_error',    'Compilation Error'
        SECURITY_VIOLATION   = 'security_violation',   'Security Violation'
        SYSTEM_ERROR         = 'system_error',         'System Error'

    RUN_TYPE_CHOICES = [
        ('run', 'Run'),
        ('submit', 'Submit'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='submissions',
    )
    problem = models.ForeignKey(
        'problems.Problem',
        on_delete=models.CASCADE,
        related_name='submissions',
    )
    language = models.CharField(max_length=20, choices=Language.choices)
    code = models.TextField()
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING,
    )
    run_type = models.CharField(
        max_length=10,
        choices=RUN_TYPE_CHOICES,
        default='submit',
    )
    time_used = models.FloatField(null=True, blank=True, help_text='Millisekundlarda')
    memory_used = models.FloatField(null=True, blank=True, help_text='MB da')
    error_message = models.TextField(blank=True, help_text='Compilation/runtime error xabari')
    extra_data = models.JSONField(null=True, blank=True, help_text="Run mode test results / qo'shimcha ma'lumot")

    # Failed test case ma'lumotlari (WA, RE holatida)
    failed_test_number = models.IntegerField(null=True, blank=True)
    failed_test_input = models.TextField(blank=True, default='')
    failed_test_expected = models.TextField(blank=True, default='')
    failed_test_actual = models.TextField(blank=True, default='')

    # YANGI: Isolate judge uchun qo'shimcha fieldlar
    test_results = models.JSONField(
        default=list, blank=True,
        help_text="Har bir test natijasi: [{'test_case_id': 1, 'status': 'accepted', ...}]"
    )
    compile_output = models.TextField(
        blank=True, default='',
        help_text='Compilation output (errors/warnings)'
    )
    finished_at = models.DateTimeField(
        null=True, blank=True,
        help_text='Judge tugagan vaqt'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'problem', '-created_at']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} — {self.problem.title} — {self.get_status_display()}"

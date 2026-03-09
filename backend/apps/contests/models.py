from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from django.conf import settings


# RANK DARAJALARI
RANK_LEVELS = [
    (0,    800,  'Newbie',                    '#808080'),
    (800,  1200, 'Pupil',                     '#008000'),
    (1200, 1400, 'Specialist',                '#03a89e'),
    (1400, 1600, 'Expert',                    '#0000ff'),
    (1600, 1900, 'Candidate Master',          '#aa00aa'),
    (1900, 2100, 'Master',                    '#ff8c00'),
    (2100, 2300, 'International Master',      '#ff8c00'),
    (2300, 2400, 'Grandmaster',               '#ff0000'),
    (2400, 2600, 'International Grandmaster', '#ff0000'),
    (2600, 9999, 'Legendary Grandmaster',     '#ff0000'),
]

def get_rank_title(rating: int) -> str:
    for low, high, title, _ in RANK_LEVELS:
        if low <= rating < high:
            return title
    return 'Legendary Grandmaster'

def get_rank_color(rating: int) -> str:
    for low, high, _, color in RANK_LEVELS:
        if low <= rating < high:
            return color
    return '#ff0000'


class Contest(models.Model):
    """Musobaqa (ACM ICPC uslubida)."""
    TYPES = [
        ('icpc',    'ACM/ICPC'),
        ('rated',   'Rated'),
        ('virtual', 'Virtual'),
        ('unrated', 'Unrated'),
    ]
    STATUS = [
        ('draft',    'Draft'),
        ('upcoming', 'Upcoming'),
        ('running',  'Running'),
        ('frozen',   'Frozen'),
        ('finished', 'Finished'),
    ]

    title        = models.CharField(max_length=200)
    slug         = models.SlugField(max_length=200, unique=True, blank=True)
    description  = models.TextField(blank=True)
    contest_type = models.CharField(max_length=20, choices=TYPES, default='icpc')
    status       = models.CharField(max_length=20, choices=STATUS, default='draft')

    start_time  = models.DateTimeField()
    end_time    = models.DateTimeField()
    freeze_time = models.DateTimeField(
        null=True, blank=True,
        help_text='Scoreboard freeze boshlanadi'
    )

    is_team_contest    = models.BooleanField(default=False)
    max_team_size      = models.IntegerField(default=3)
    is_rated           = models.BooleanField(default=True)
    is_public          = models.BooleanField(default=True)
    is_virtual_allowed = models.BooleanField(default=True)
    rating_calculated  = models.BooleanField(default=False)
    rating_calculating = models.BooleanField(
        default=False,
        help_text='Hisoblash jarayonida (race condition himoyasi)'
    )
    rating_frozen      = models.BooleanField(default=False)

    def get_rank_title(self, rating: int) -> str:
        return get_rank_title(rating)

    problems   = models.ManyToManyField(
        'problems.Problem',
        through='ContestProblem',
        related_name='contests',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='created_contests',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_time']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)
            if not base:
                base = 'contest'
            slug = base
            n = 1
            while Contest.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base}-{n}'
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def duration_minutes(self):
        return int((self.end_time - self.start_time).total_seconds() / 60)

    def get_current_status(self):
        now = timezone.now()
        if now < self.start_time:
            return 'upcoming'
        if now > self.end_time:
            return 'finished'
        if self.freeze_time and now >= self.freeze_time:
            return 'frozen'
        return 'running'

    def sync_status(self):
        new = self.get_current_status()
        if self.status != new and self.status != 'draft':
            self.status = new
            self.save(update_fields=['status'])
        return self.status


class ContestProblem(models.Model):
    """Kontest masalasi (tartib va ball bilan)."""
    contest = models.ForeignKey(
        Contest, on_delete=models.CASCADE,
        related_name='contest_problems',
    )
    problem = models.ForeignKey(
        'problems.Problem', on_delete=models.CASCADE,
    )
    order = models.IntegerField(default=0)
    label = models.CharField(max_length=3, default='A')
    score = models.IntegerField(default=100)
    
    # YANGI: Contest darajasidagi ball sozlamasi
    max_score = models.IntegerField(
        null=True, blank=True,
        help_text=(
            'Agar bo\'sh bo\'lsa problem.max_score ishlatiladi. '
            'Codeforces: 500, 1000, 1500, 2000, 2500, 3000'
        )
    )

    def get_max_score(self) -> int:
        """Contest yoki problem darajasidagi max ball."""
        return self.max_score or self.problem.max_score or 0

    class Meta:
        ordering = ['order']
        unique_together = [
            ('contest', 'problem'),
            ('contest', 'label'),
        ]

    def __str__(self):
        return f'{self.contest} — {self.label}'


class Team(models.Model):
    """Contest jamoasi."""
    contest = models.ForeignKey(
        Contest, on_delete=models.CASCADE,
        related_name='teams',
    )
    name    = models.CharField(max_length=100)
    leader  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='led_teams',
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='TeamMember',
        related_name='contest_teams',
    )
    invite_code = models.CharField(max_length=8, unique=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('contest', 'name')]

    def __str__(self):
        return f'{self.contest} — {self.name}'

    def save(self, *args, **kwargs):
        if not self.invite_code:
            import secrets
            self.invite_code = secrets.token_hex(4).upper()
        super().save(*args, **kwargs)


class TeamMember(models.Model):
    """Jamoa a'zosi."""
    ROLES = [
        ('leader', 'Leader'),
        ('member', 'Member'),
    ]
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='team_members')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('team', 'user')]


class ContestRegistration(models.Model):
    """Kontestga ro'yxatdan o'tish."""
    contest       = models.ForeignKey(
        Contest, on_delete=models.CASCADE,
        related_name='registrations',
    )
    user          = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='contest_registrations',
    )
    team          = models.ForeignKey(
        Team, on_delete=models.SET_NULL,
        null=True, blank=True,
    )
    is_virtual    = models.BooleanField(default=False)
    virtual_start = models.DateTimeField(null=True, blank=True)
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('contest', 'user')]


class ContestSubmission(models.Model):
    """Kontest davomida yuborilgan submission."""
    contest        = models.ForeignKey(
        Contest, on_delete=models.CASCADE,
        related_name='contest_submissions',
    )
    submission     = models.OneToOneField(
        'submissions.Submission',
        on_delete=models.CASCADE,
        related_name='contest_submission',
    )
    user           = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    team           = models.ForeignKey(
        Team, on_delete=models.SET_NULL,
        null=True, blank=True,
    )
    problem        = models.ForeignKey(
        'problems.Problem', on_delete=models.CASCADE,
    )
    contest_problem = models.ForeignKey(
        ContestProblem, on_delete=models.CASCADE,
    )
    is_virtual         = models.BooleanField(default=False)
    minutes_from_start = models.IntegerField(default=0)

    class Meta:
        ordering = ['minutes_from_start']

    def __str__(self):
        return f'{self.user} — {self.contest_problem.label} ({self.contest})'


class ScoreboardEntry(models.Model):
    """Kontest scoreboarddagi yozuv (cache)."""
    contest      = models.ForeignKey(
        Contest, on_delete=models.CASCADE,
        related_name='scoreboard',
    )
    user         = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True,
    )
    team         = models.ForeignKey(
        Team, on_delete=models.SET_NULL,
        null=True, blank=True,
    )
    is_virtual   = models.BooleanField(default=False)
    solved_count = models.IntegerField(default=0)
    penalty      = models.IntegerField(default=0)
    problem_results  = models.JSONField(default=dict)
    
    # YANGI: Ball tizimi uchun
    total_score = models.IntegerField(
        default  = 0,
        help_text = 'Jami ball (Codeforces uslubi)'
    )
    problem_scores = models.JSONField(
        default  = dict,
        help_text = 'Har bir masala uchun ball tafsilotlari'
    )
    
    rank             = models.IntegerField(default=0)
    last_accept_time = models.IntegerField(default=0)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['rank']
        unique_together = [('contest', 'user')]


class RatingChange(models.Model):
    user    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete    = models.CASCADE,
        related_name = 'rating_changes',
    )
    contest = models.ForeignKey(
        'Contest',
        on_delete    = models.CASCADE,
        related_name = 'rating_changes',
    )

    old_rating     = models.IntegerField(default=0)
    new_rating     = models.IntegerField(default=0)
    delta          = models.IntegerField(default=0)

    rank           = models.IntegerField()
    expected_rank  = models.FloatField(default=0)

    solved_count   = models.IntegerField(default=0)
    penalty        = models.IntegerField(default=0)

    old_rank_title = models.CharField(max_length=50, blank=True)
    new_rank_title = models.CharField(max_length=50, blank=True)

    calculated_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'contest')
        ordering        = ['rank']

    def __str__(self):
        sign = '+' if self.delta >= 0 else ''
        return (
            f'{self.user.username}: '
            f'{self.old_rating} → {self.new_rating} '
            f'({sign}{self.delta})'
        )

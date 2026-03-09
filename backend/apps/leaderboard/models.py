from django.db import models
from django.conf import settings


class UserRating(models.Model):
    """
    Foydalanuvchi reytingi.
    Codeforces/ELO uslubidagi reyting tizimi.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='user_rating',
    )
    rating = models.IntegerField(default=1200, db_index=True)
    max_rating = models.IntegerField(default=1200)
    rank = models.IntegerField(default=0, db_index=True)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-rating']

    def save(self, *args, **kwargs):
        # max_rating ni yangilash
        if self.rating > self.max_rating:
            self.max_rating = self.rating
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} — {self.rating}"

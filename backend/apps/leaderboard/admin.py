from django.contrib import admin
from .models import UserRating
from .services import get_rank_title


@admin.register(UserRating)
class UserRatingAdmin(admin.ModelAdmin):
    list_display = ('user', 'rating', 'max_rating', 'rank', 'rank_title_display', 'last_updated')
    list_filter = ('rank',)
    search_fields = ('user__username',)
    readonly_fields = ('last_updated',)
    raw_id_fields = ('user',)

    @admin.display(description='Rank Title')
    def rank_title_display(self, obj):
        info = get_rank_title(obj.rating)
        return f"{info['title']}"

from django.contrib import admin
from .models import (
    Contest, ContestProblem, Team, TeamMember,
    ContestRegistration, ContestSubmission,
    ScoreboardEntry, RatingChange,
)


class ContestProblemInline(admin.TabularInline):
    model = ContestProblem
    extra = 3
    fields = ('order', 'label', 'problem', 'score')
    raw_id_fields = ('problem',)


@admin.register(Contest)
class ContestAdmin(admin.ModelAdmin):
    list_display = ('title', 'contest_type', 'status', 'start_time', 'end_time', 'is_rated', 'is_public')
    list_filter = ('contest_type', 'status', 'is_rated', 'is_public')
    search_fields = ('title',)
    prepopulated_fields = {'slug': ('title',)}
    inlines = [ContestProblemInline]
    list_editable = ('status', 'is_public')


@admin.register(ContestProblem)
class ContestProblemAdmin(admin.ModelAdmin):
    list_display = ('contest', 'label', 'problem', 'order', 'score')
    list_filter = ('contest',)
    raw_id_fields = ('contest', 'problem')


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'contest', 'leader', 'invite_code', 'created_at')
    list_filter = ('contest',)
    search_fields = ('name',)


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ('team', 'user', 'role', 'joined_at')
    list_filter = ('role',)


@admin.register(ContestRegistration)
class ContestRegistrationAdmin(admin.ModelAdmin):
    list_display = ('contest', 'user', 'team', 'is_virtual', 'registered_at')
    list_filter = ('contest', 'is_virtual')
    search_fields = ('user__username',)


@admin.register(ContestSubmission)
class ContestSubmissionAdmin(admin.ModelAdmin):
    list_display = ('contest', 'user', 'contest_problem', 'is_virtual', 'minutes_from_start')
    list_filter = ('contest', 'is_virtual')
    raw_id_fields = ('submission', 'contest', 'contest_problem', 'user')


@admin.register(ScoreboardEntry)
class ScoreboardEntryAdmin(admin.ModelAdmin):
    list_display = ('contest', 'user', 'team', 'rank', 'solved_count', 'penalty', 'is_virtual')
    list_filter = ('contest', 'is_virtual')


@admin.register(RatingChange)
class RatingChangeAdmin(admin.ModelAdmin):
    list_display = ('contest', 'user', 'old_rating', 'new_rating', 'delta', 'rank')
    list_filter = ('contest',)
    search_fields = ('user__username',)

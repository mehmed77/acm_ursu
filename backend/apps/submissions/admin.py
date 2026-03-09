from django.contrib import admin
from .models import Submission


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'problem', 'language', 'status', 'time_used', 'memory_used', 'created_at')
    list_filter = ('status', 'language', 'created_at')
    search_fields = ('user__username', 'problem__title')
    readonly_fields = ('created_at', 'failed_test_number', 'failed_test_input', 'failed_test_expected', 'failed_test_actual')
    raw_id_fields = ('user', 'problem')

from django.contrib import admin
from .models import Problem, TestCase, Tag, ProblemComment, ProblemRating
from .testcase_loader import count_testcases


class TestCaseInline(admin.TabularInline):
    """Masala ichida test case qo'shish."""
    model = TestCase
    extra = 2
    fields = ('file_number', 'input_data', 'expected_output', 'is_sample')


@admin.register(Problem)
class ProblemAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'difficulty', 'is_published', 'file_testcases', 'db_testcases', 'author', 'created_at')
    list_filter = ('difficulty', 'is_published', 'tags')
    search_fields = ('title', 'description')
    prepopulated_fields = {'slug': ('title',)}
    inlines = [TestCaseInline]
    filter_horizontal = ('tags',)
    list_editable = ('is_published',)

    def file_testcases(self, obj):
        c = count_testcases(obj.slug)
        return f'📁 {c}' if c else '—'
    file_testcases.short_description = 'Fayl'

    def db_testcases(self, obj):
        c = obj.test_cases.count()
        return f'🗄 {c}' if c else '—'
    db_testcases.short_description = 'DB'


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)


@admin.register(TestCase)
class TestCaseAdmin(admin.ModelAdmin):
    list_display = ('problem', 'file_number', 'is_sample')
    list_filter = ('is_sample', 'problem')


@admin.register(ProblemComment)
class ProblemCommentAdmin(admin.ModelAdmin):
    list_display  = ('id', 'author', 'problem', 'comment_type', 'like_count', 'is_hidden', 'created_at')
    list_filter   = ('comment_type', 'is_hidden', 'problem')
    search_fields = ('content', 'author__username')
    list_editable = ('is_hidden',)
    raw_id_fields = ('author', 'problem', 'parent')


@admin.register(ProblemRating)
class ProblemRatingAdmin(admin.ModelAdmin):
    list_display  = ('id', 'user', 'problem', 'rating', 'created_at')
    list_filter   = ('rating', 'problem')
    search_fields = ('user__username',)
    raw_id_fields = ('user', 'problem')

from django.contrib import admin
from .models import Problem, TestCase, Tag
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

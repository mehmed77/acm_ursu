"""
Fayl asosidagi test caselarni DB ga import qiladi.

Foydalanish:
  python manage.py import_testcases                    # Barchasi
  python manage.py import_testcases yigindi-a-b        # Bitta masala
  python manage.py import_testcases --validate         # Faqat tekshirish
  python manage.py import_testcases --overwrite        # Mavjudlarni o'chirish
"""
from django.core.management.base import BaseCommand
from apps.problems.models import Problem, TestCase
from apps.problems.testcase_loader import (
    load_testcases_from_files,
    validate_testcase_files,
)


class Command(BaseCommand):
    help = "Fayl asosidagi test caselarni DB ga import qiladi"

    def add_arguments(self, parser):
        parser.add_argument('slug', nargs='?', help="Masala slug (bo'sh = hammasi)")
        parser.add_argument('--validate', action='store_true', help='Faqat tekshirish')
        parser.add_argument('--overwrite', action='store_true', help="Mavjudlarni o'chirish")

    def handle(self, *args, **options):
        slug = options.get('slug')
        validate_only = options['validate']

        if slug:
            problems = Problem.objects.filter(slug=slug)
        else:
            problems = Problem.objects.all()

        if not problems.exists():
            self.stdout.write(self.style.ERROR('Masala topilmadi: %s' % slug))
            return

        for problem in problems:
            self.stdout.write('\n[FILE] %s (%s)' % (problem.title, problem.slug))

            validation = validate_testcase_files(problem.slug)

            if validation['missing_out']:
                self.stdout.write(self.style.WARNING(
                    "  [!] .out fayli yo'q: %s" % validation['missing_out']
                ))
            if validation['missing_in']:
                self.stdout.write(self.style.WARNING(
                    "  [!] .in fayli yo'q: %s" % validation['missing_in']
                ))

            if validate_only:
                self.stdout.write("  [OK] Yaroqli test caselar: %d ta" % validation['total'])
                continue

            tests = load_testcases_from_files(problem.slug)
            if not tests:
                self.stdout.write(self.style.WARNING("  [X] Test case fayllari topilmadi"))
                continue

            if options['overwrite']:
                deleted, _ = TestCase.objects.filter(problem=problem).delete()
                if deleted:
                    self.stdout.write("  [DEL] %d ta eski test case o'chirildi" % deleted)

            created = 0
            for t in tests:
                _, is_new = TestCase.objects.get_or_create(
                    problem=problem,
                    input=t['input'],
                    expected_output=t['output'],
                    defaults={
                        'is_sample': t['is_sample'],
                        'order': t['number'],
                    },
                )
                if is_new:
                    created += 1

            self.stdout.write(self.style.SUCCESS(
                "  [OK] %d ta yangi test case import qilindi (%d ta jami)" % (created, len(tests))
            ))

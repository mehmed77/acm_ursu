"""
BOM va encoding muammolarini testcase fayllardan tozalaydi.

Foydalanish:
  python manage.py fix_testcase_encoding                    # Barchasi
  python manage.py fix_testcase_encoding yigindi-a-b        # Bitta masala
"""
import os
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = "BOM va encoding muammolarini testcase fayllardan tozalaydi"

    def add_arguments(self, parser):
        parser.add_argument('slug', nargs='?', help="Masala slug (bo'sh = hammasi)")

    def handle(self, *args, **options):
        tc_dir = getattr(settings, 'TESTCASES_DIR',
                         os.path.join(settings.BASE_DIR, 'testcases'))
        slug = options.get('slug')

        if not os.path.isdir(tc_dir):
            self.stdout.write(self.style.ERROR('Testcases papka topilmadi: %s' % tc_dir))
            return

        if slug:
            dirs = [os.path.join(tc_dir, slug)]
        else:
            dirs = [
                os.path.join(tc_dir, d)
                for d in os.listdir(tc_dir)
                if os.path.isdir(os.path.join(tc_dir, d))
            ]

        total_fixed = 0

        for problem_dir in dirs:
            if not os.path.isdir(problem_dir):
                self.stdout.write(self.style.ERROR('Papka topilmadi: %s' % problem_dir))
                continue

            problem_slug = os.path.basename(problem_dir)
            fixed = 0

            files = sorted([
                f for f in os.listdir(problem_dir)
                if f.endswith('.in') or f.endswith('.out')
            ])

            for fname in files:
                fpath = os.path.join(problem_dir, fname)

                with open(fpath, 'rb') as f:
                    raw = f.read()

                has_bom = raw.startswith(b'\xef\xbb\xbf')
                has_crlf = b'\r\n' in raw

                if has_bom or has_crlf:
                    # UTF-8-sig bilan o'qish (BOM olib tashlaydi)
                    with open(fpath, 'r', encoding='utf-8-sig', errors='replace') as f:
                        content = f.read()

                    cleaned = content.replace('\r\n', '\n').replace('\r', '\n').rstrip('\n')

                    with open(fpath, 'w', encoding='utf-8', newline='\n') as f:
                        f.write(cleaned)

                    issues = []
                    if has_bom:
                        issues.append('BOM')
                    if has_crlf:
                        issues.append('CRLF')

                    self.stdout.write('  [FIX] %s (%s)' % (fname, ', '.join(issues)))
                    fixed += 1

            if fixed > 0:
                self.stdout.write(self.style.SUCCESS(
                    '[OK] %s: %d ta fayl tuzatildi' % (problem_slug, fixed)
                ))
            else:
                self.stdout.write('[OK] %s: hamma fayl yaxshi' % problem_slug)

            total_fixed += fixed

        self.stdout.write(self.style.SUCCESS('\nJami: %d ta fayl tuzatildi' % total_fixed))

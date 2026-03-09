"""
Fayl asosidagi test case tizimi.

Papka strukturasi:
  testcases/
  └── {problem_slug}/
      ├── 001.in
      ├── 001.out
      ├── 002.in
      ├── 002.out
      ...

Birinchi 2 ta test case → is_sample = True
"""
import os
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

TESTCASES_DIR = getattr(settings, 'TESTCASES_DIR',
                        os.path.join(settings.BASE_DIR, 'testcases'))


def get_testcase_dir(problem_slug):
    """Masalaning test case papkasini qaytaradi."""
    return os.path.join(TESTCASES_DIR, problem_slug)


def _clean_text(text):
    """BOM va boshqa yashirin belgilarni tozalaydi."""
    text = text.lstrip('\ufeff')
    text = text.replace('\r\n', '\n')
    text = text.replace('\r', '\n')
    text = text.rstrip('\n')
    return text


def load_testcases_from_files(problem_slug):
    """
    Fayllardan test caselarni o'qiydi.

    Returns:
        list of dict: [
            {'number': 1, 'input': '...', 'output': '...', 'is_sample': True},
            ...
        ]
    """
    tc_dir = get_testcase_dir(problem_slug)

    if not os.path.isdir(tc_dir):
        return []

    # Barcha .in fayllarni topish va raqamli tartibda saralash
    in_files = sorted([
        f for f in os.listdir(tc_dir)
        if f.endswith('.in')
    ], key=lambda x: int(''.join(filter(str.isdigit, os.path.basename(x))) or '0'))

    testcases = []
    for in_file in in_files:
        num_str = in_file.replace('.in', '')
        out_file = num_str + '.out'
        in_path = os.path.join(tc_dir, in_file)
        out_path = os.path.join(tc_dir, out_file)

        # .out fayl yo'q bo'lsa o'tkazib yuborish
        if not os.path.exists(out_path):
            logger.warning(f"Test case {in_file} uchun {out_file} topilmadi")
            continue

        try:
            number = int(num_str)
        except ValueError:
            continue

        try:
            with open(in_path, 'r', encoding='utf-8-sig') as f:
                input_data = _clean_text(f.read())
            with open(out_path, 'r', encoding='utf-8-sig') as f:
                output_data = _clean_text(f.read())

            testcases.append({
                'number': number,
                'input': input_data,
                'output': output_data,
                'is_sample': number <= 2,
            })
        except Exception as e:
            logger.error(f"Test case {in_file} o'qishda xato: {e}")
            continue

    return sorted(testcases, key=lambda x: x['number'])


def count_testcases(problem_slug):
    """Test case fayllar sonini qaytaradi."""
    tc_dir = get_testcase_dir(problem_slug)
    if not os.path.isdir(tc_dir):
        return 0
    in_files = [f for f in os.listdir(tc_dir) if f.endswith('.in')]
    out_files = {f.replace('.out', '') for f in os.listdir(tc_dir) if f.endswith('.out')}
    return sum(1 for f in in_files if f.replace('.in', '') in out_files)


def validate_testcase_files(problem_slug):
    """
    Test case fayllarini tekshiradi.

    Returns:
        dict: valid, missing_out, missing_in, total
    """
    tc_dir = get_testcase_dir(problem_slug)
    if not os.path.isdir(tc_dir):
        return {'valid': [], 'missing_out': [], 'missing_in': [], 'total': 0}

    all_files = set(os.listdir(tc_dir))
    in_files = {f for f in all_files if f.endswith('.in')}
    out_files = {f for f in all_files if f.endswith('.out')}

    in_bases = {f[:-3] for f in in_files}
    out_bases = {f[:-4] for f in out_files}

    valid = sorted(in_bases & out_bases)
    missing_out = sorted(in_bases - out_bases)
    missing_in = sorted(out_bases - in_bases)

    return {
        'valid': valid,
        'missing_out': [f + '.in' for f in missing_out],
        'missing_in': [f + '.out' for f in missing_in],
        'total': len(valid),
    }

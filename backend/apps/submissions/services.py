"""
Judge0 API bilan integratsiya.
Kod yuborish va natijalarni olish.
"""
import base64
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# CLAUDE.md dagi language_id mapping
LANGUAGE_MAP = {
    'python': 71,       # Python 3
    'cpp': 54,          # C++ 17
    'java': 62,         # Java
    'javascript': 63,   # JavaScript (Node.js)
}

# Judge0 status_id -> bizning status mapping
JUDGE0_STATUS_MAP = {
    1: 'pending',                # In Queue
    2: 'running',                # Processing
    3: 'accepted',               # Accepted
    4: 'wrong_answer',           # Wrong Answer
    5: 'time_limit_exceeded',    # Time Limit Exceeded
    6: 'compilation_error',      # Compilation Error
    7: 'runtime_error',          # Runtime Error (SIGSEGV)
    8: 'runtime_error',          # Runtime Error (SIGXFSZ)
    9: 'runtime_error',          # Runtime Error (SIGFPE)
    10: 'runtime_error',         # Runtime Error (SIGABRT)
    11: 'runtime_error',         # Runtime Error (NZEC)
    12: 'runtime_error',         # Runtime Error (Other)
    13: 'compilation_error',     # Internal Error
    14: 'runtime_error',         # Exec Format Error
}


def _encode_base64(text):
    """Matnni base64 ga encode qiladi."""
    if text is None:
        return None
    return base64.b64encode(text.encode('utf-8')).decode('utf-8')


def _decode_base64(text):
    """Base64 dan decode qiladi."""
    if text is None:
        return None
    try:
        return base64.b64decode(text).decode('utf-8')
    except Exception:
        return text


def _get_headers():
    """Judge0 API uchun headers."""
    return {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': settings.JUDGE0_API_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
    }


def submit_to_judge0(submission):
    """
    Submission ni Judge0 API ga yuboradi.
    Barcha test caselar uchun batch submission.

    Args:
        submission: Submission model instance

    Returns:
        list: Judge0 token lar ro'yxati
    """
    test_cases = submission.problem.test_cases.all().order_by('file_number', 'id')
    language_id = LANGUAGE_MAP.get(submission.language)

    if not language_id:
        raise ValueError(f"Noto'g'ri til: {submission.language}")

    if not test_cases.exists():
        raise ValueError(f"Masalada test caselar yo'q: {submission.problem.title}")

    # Batch submission (bir marta yuboramiz)
    submissions_data = []
    for tc in test_cases:
        submissions_data.append({
            'source_code': _encode_base64(submission.code),
            'language_id': language_id,
            'stdin': _encode_base64(tc.input_data),
            'expected_output': _encode_base64(tc.expected_output),
            'cpu_time_limit': submission.problem.time_limit,
            'memory_limit': submission.problem.memory_limit * 1024,  # MB → KB
        })

    url = f"{settings.JUDGE0_BASE_URL}/submissions/batch"
    params = {'base64_encoded': 'true'}

    try:
        response = requests.post(
            url,
            json={'submissions': submissions_data},
            headers=_get_headers(),
            params=params,
            timeout=30,
        )
        response.raise_for_status()
        tokens = [item['token'] for item in response.json()]
        logger.info(f"Judge0 ga {len(tokens)} ta test yuborildi: submission #{submission.id}")
        return tokens
    except requests.RequestException as e:
        logger.error(f"Judge0 API xatosi: {e}")
        raise


def get_judge0_result(token):
    """
    Judge0 dan bitta submission natijasini oladi.

    Args:
        token: Judge0 token

    Returns:
        dict: {status, time, memory, error_message}
    """
    url = f"{settings.JUDGE0_BASE_URL}/submissions/{token}"
    params = {
        'base64_encoded': 'true',
        'fields': 'status_id,stdout,stderr,compile_output,time,memory',
    }

    try:
        response = requests.get(
            url,
            headers=_get_headers(),
            params=params,
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()

        status_id = data.get('status_id', 0)
        result = {
            'status': JUDGE0_STATUS_MAP.get(status_id, 'runtime_error'),
            'time': float(data.get('time', 0) or 0),
            'memory': float(data.get('memory', 0) or 0),
            'error_message': '',
        }

        # Error xabarlarini decode qilish
        if data.get('compile_output'):
            result['error_message'] = _decode_base64(data['compile_output'])
        elif data.get('stderr'):
            result['error_message'] = _decode_base64(data['stderr'])

        return result
    except requests.RequestException as e:
        logger.error(f"Judge0 natija olishda xato: {e}")
        raise


def get_batch_results(tokens):
    """
    Bir nechta token lar uchun natijalarni oladi.

    Args:
        tokens: list of Judge0 tokens

    Returns:
        list of dict: [{status, time, memory, error_message}, ...]
    """
    tokens_str = ','.join(tokens)
    url = f"{settings.JUDGE0_BASE_URL}/submissions/batch"
    params = {
        'tokens': tokens_str,
        'base64_encoded': 'true',
        'fields': 'token,status_id,stdout,stderr,compile_output,time,memory',
    }

    try:
        response = requests.get(
            url,
            headers=_get_headers(),
            params=params,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        results = []
        for item in data.get('submissions', []):
            status_id = item.get('status_id', 0)
            result = {
                'status_id': status_id,
                'status': JUDGE0_STATUS_MAP.get(status_id, 'runtime_error'),
                'time': float(item.get('time', 0) or 0),
                'memory': float(item.get('memory', 0) or 0),
                'error_message': '',
            }
            if item.get('compile_output'):
                result['error_message'] = _decode_base64(item['compile_output'])
            elif item.get('stderr'):
                result['error_message'] = _decode_base64(item['stderr'])
            results.append(result)

        return results
    except requests.RequestException as e:
        logger.error(f"Judge0 batch natija olishda xato: {e}")
        raise

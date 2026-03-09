"""
Celery tasks for submission processing.
Run mode: DB test caselar, Submit mode: Fayl test caselar.
"""
import logging

from celery import shared_task
from django.db.models import F

from .models import Submission
from .judge_engine import judge_submission

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def run_submission(self, submission_id):
    """
    Submissionni Isolate sandbox ichida judge qiladi.
    run_type='run':    DB sample testlar bilan sinash (run_code_sync)
    run_type='submit': Fayl yoki DB testlar bilan rasmiy judge (judge_submission)
    """
    try:
        submission = Submission.objects.select_related(
            'problem', 'user'
        ).get(id=submission_id)
    except Submission.DoesNotExist:
        logger.error("Submission #%d topilmadi" % submission_id)
        return

    run_type = submission.run_type or 'submit'

    # Status: RUNNING
    submission.status = Submission.Status.RUNNING
    submission.save(update_fields=['status'])

    logger.info(
        "[%s] #%d boshlandi | Til: %s | Masala: %s" % (
            run_type.upper(), submission_id,
            submission.language, submission.problem.slug,
        )
    )

    try:
        if run_type == 'run':
            # ── RUN MODE ──
            # DB dagi sample testlarni Isolate da sinash
            from apps.problems.models import TestCase
            from .judge_engine import run_code_sync

            sample_tests = list(
                TestCase.objects.filter(
                    problem=submission.problem,
                    is_sample=True,
                ).order_by('file_number', 'id')
            )

            if not sample_tests:
                submission.status = Submission.Status.SYSTEM_ERROR
                submission.error_message = 'Namuna test topilmadi'
                submission.save(update_fields=['status', 'error_message'])
                return

            result = run_code_sync(
                code=submission.code,
                language=submission.language,
                test_cases=sample_tests,
                time_limit=submission.problem.time_limit or 1.0,
                memory_limit=submission.problem.memory_limit or 256,
            )

            # Status mapping
            status_map = {
                'ACCEPTED':              Submission.Status.ACCEPTED,
                'WRONG_ANSWER':          Submission.Status.WRONG_ANSWER,
                'TIME_LIMIT_EXCEEDED':   Submission.Status.TIME_LIMIT_EXCEEDED,
                'MEMORY_LIMIT_EXCEEDED': Submission.Status.MEMORY_LIMIT_EXCEEDED,
                'RUNTIME_ERROR':         Submission.Status.RUNTIME_ERROR,
                'COMPILATION_ERROR':     Submission.Status.COMPILATION_ERROR,
                'SECURITY_VIOLATION':    Submission.Status.SECURITY_VIOLATION,
                'SYSTEM_ERROR':          Submission.Status.RUNTIME_ERROR,
            }

            submission.status = status_map.get(
                result['status'], Submission.Status.RUNTIME_ERROR
            )
            submission.time_used = result.get('max_time', 0)
            submission.memory_used = result.get('max_memory', 0)
            submission.error_message = result.get('error_message', '') or ''
            submission.extra_data = {
                'run_mode': True,
                'test_results': result.get('test_results', []),
            }
            submission.save()

            logger.info(
                "[RUN] #%d: %s | %dms" % (
                    submission_id, result['status'],
                    result.get('max_time', 0),
                )
            )

        else:
            # ── SUBMIT MODE ──
            result = judge_submission(submission)

            status_map = {
                'ACCEPTED':              Submission.Status.ACCEPTED,
                'WRONG_ANSWER':          Submission.Status.WRONG_ANSWER,
                'TIME_LIMIT_EXCEEDED':   Submission.Status.TIME_LIMIT_EXCEEDED,
                'MEMORY_LIMIT_EXCEEDED': Submission.Status.MEMORY_LIMIT_EXCEEDED,
                'RUNTIME_ERROR':         Submission.Status.RUNTIME_ERROR,
                'COMPILATION_ERROR':     Submission.Status.COMPILATION_ERROR,
                'SECURITY_VIOLATION':    Submission.Status.SECURITY_VIOLATION,
                'SYSTEM_ERROR':          Submission.Status.RUNTIME_ERROR,
            }

            submission.status = status_map.get(
                result['status'], Submission.Status.RUNTIME_ERROR
            )
            submission.time_used = result.get('time_used', 0)
            submission.memory_used = result.get('memory_used', 0)
            submission.error_message = result.get('error_message', '') or ''

            if result.get('failed_test'):
                ft = result['failed_test']
                submission.failed_test_number = ft.get('number')
                submission.failed_test_input = ft.get('input', '')
                submission.failed_test_expected = ft.get('expected', '')
                submission.failed_test_actual = ft.get('got', '')
                submission.extra_data = ft

            submission.save()

            # Faqat SUBMIT + ACCEPTED da solved_count oshadi
            if result['status'] == 'ACCEPTED':
                _update_solved_count(submission)

            logger.info(
                "[SUBMIT] #%d: %s | %dms | %dMB" % (
                    submission_id, result['status'],
                    result.get('time_used', 0),
                    result.get('memory_used', 0),
                )
            )

    except Exception as exc:
        logger.error("[ERROR] #%d: %s" % (submission_id, exc))
        submission.status = Submission.Status.RUNTIME_ERROR
        submission.error_message = str(exc)[:500]
        submission.save(update_fields=['status', 'error_message'])
        raise self.retry(exc=exc, countdown=10)


def _update_solved_count(submission):
    """
    Foydalanuvchi shu masalani birinchi marta yechgan bo'lsa,
    solved_count ni 1 ga oshiradi.
    """
    previous_accepted = Submission.objects.filter(
        user=submission.user,
        problem=submission.problem,
        status=Submission.Status.ACCEPTED,
        run_type='submit',
    ).exclude(id=submission.id).exists()

    if not previous_accepted:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        User.objects.filter(id=submission.user_id).update(
            solved_count=F('solved_count') + 1
        )
        logger.info("User %s: solved_count += 1" % submission.user.username)


@shared_task(bind=True)
def run_code_sync_task(self, task_id, slug, code, language, time_limit, memory_limit):
    """
    DB ga yozmasdan faqat namuna testlarni ishlatib,
    natijani cache ga saqlaydi.
    """
    from apps.problems.models import Problem
    from django.core.cache import cache
    from .judge_engine import run_code_sync
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        problem = Problem.objects.get(slug=slug)
        test_cases = list(problem.test_cases.filter(is_sample=True).order_by('file_number', 'id'))
        
        result = run_code_sync(code, language, test_cases, time_limit, memory_limit)
        
        final_data = {
            'status': result['status'],
            'time_used': result.get('max_time', 0),
            'memory_used': result.get('max_memory', 0),
            'error_message': result.get('error_message', ''),
            'extra_data': {'test_results': result.get('test_results', [])},
            'is_sync_run': True
        }
        cache.set(f"run_task_{task_id}", final_data, timeout=600)
    except Exception as e:
        logger.error(f"run_code_sync_task error: {e}")
        cache.set(f"run_task_{task_id}", {
            'status': 'SYSTEM_ERROR',
            'error_message': str(e),
            'is_sync_run': True
        }, timeout=600)

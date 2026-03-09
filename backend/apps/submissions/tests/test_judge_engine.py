# ═══════════════════════════════════════════════════════════════════════════════
# test_judge_engine.py — Unit tests for judge engine logic
#
# These tests run WITHOUT Docker or isolate — they test pure Python logic.
# ═══════════════════════════════════════════════════════════════════════════════

import unittest
from unittest.mock import MagicMock, patch


class TestOutputsMatch(unittest.TestCase):
    """Test _outputs_match() — IOI-style output comparison."""

    def setUp(self):
        from apps.submissions.judge_engine import _outputs_match
        self.match = _outputs_match

    def test_exact_match(self):
        self.assertTrue(self.match('42\n', '42\n'))

    def test_exact_match_no_newline(self):
        self.assertTrue(self.match('42', '42'))

    def test_trailing_whitespace_ignored(self):
        self.assertTrue(self.match('42  \n', '42\n'))

    def test_trailing_newlines_ignored(self):
        self.assertTrue(self.match('42\n\n\n', '42\n'))

    def test_multiline_match(self):
        actual   = '1\n2\n3\n'
        expected = '1\n2\n3\n'
        self.assertTrue(self.match(actual, expected))

    def test_multiline_trailing_space(self):
        actual   = '1  \n2  \n3  \n'
        expected = '1\n2\n3\n'
        self.assertTrue(self.match(actual, expected))

    def test_different_values(self):
        self.assertFalse(self.match('41\n', '42\n'))

    def test_different_line_count(self):
        self.assertFalse(self.match('1\n2\n', '1\n2\n3\n'))

    def test_empty_vs_nonempty(self):
        self.assertFalse(self.match('', '42\n'))

    def test_both_empty(self):
        self.assertTrue(self.match('', ''))

    def test_case_sensitive(self):
        self.assertFalse(self.match('Yes\n', 'yes\n'))

    def test_leading_spaces_matter(self):
        self.assertFalse(self.match('  42\n', '42\n'))


class TestMapIsolateStatus(unittest.TestCase):
    """Test _map_isolate_status() — isolate result → judge verdict."""

    def setUp(self):
        from apps.submissions.judge_engine import _map_isolate_status
        self.map_status = _map_isolate_status

    def _make_result(self, **overrides):
        base = {
            'stdout': '', 'stderr': '', 'exit_code': 0,
            'time': 0.1, 'wall_time': 0.2, 'memory': 1000,
            'status': '', 'message': '',
        }
        base.update(overrides)
        return base

    def test_timeout(self):
        result = self._make_result(status='TO')
        self.assertEqual(
            self.map_status(result, '42', 2.0, 262144),
            'time_limit_exceeded'
        )

    def test_memory_limit(self):
        result = self._make_result(memory=300000)
        self.assertEqual(
            self.map_status(result, '42', 2.0, 262144),
            'memory_limit_exceeded'
        )

    def test_runtime_error_re(self):
        result = self._make_result(status='RE')
        self.assertEqual(
            self.map_status(result, '42', 2.0, 262144),
            'runtime_error'
        )

    def test_runtime_error_sg(self):
        result = self._make_result(status='SG')
        self.assertEqual(
            self.map_status(result, '42', 2.0, 262144),
            'runtime_error'
        )

    def test_system_error_xx(self):
        result = self._make_result(status='XX')
        self.assertEqual(
            self.map_status(result, '42', 2.0, 262144),
            'system_error'
        )

    def test_nonzero_exit_code(self):
        result = self._make_result(exit_code=1)
        self.assertEqual(
            self.map_status(result, '42', 2.0, 262144),
            'runtime_error'
        )

    def test_accepted(self):
        result = self._make_result(stdout='42\n')
        self.assertEqual(
            self.map_status(result, '42\n', 2.0, 262144),
            'accepted'
        )

    def test_wrong_answer(self):
        result = self._make_result(stdout='41\n')
        self.assertEqual(
            self.map_status(result, '42\n', 2.0, 262144),
            'wrong_answer'
        )


class TestRunChecker(unittest.TestCase):
    """Test run_checker() — all checker types."""

    def setUp(self):
        from apps.submissions.judge_engine import run_checker
        self.checker = run_checker

    # ── Exact checker ──

    def test_exact_accepted(self):
        ok, score, msg = self.checker('exact', '42\n', '42\n')
        self.assertTrue(ok)
        self.assertEqual(score, 1.0)
        self.assertEqual(msg, 'OK')

    def test_exact_wrong(self):
        ok, score, msg = self.checker('exact', '41\n', '42\n')
        self.assertFalse(ok)
        self.assertEqual(score, 0.0)

    # ── Token checker ──

    def test_token_accepted(self):
        ok, score, msg = self.checker('token', '1   2   3\n', '1 2 3\n')
        self.assertTrue(ok)

    def test_token_extra_whitespace(self):
        ok, score, msg = self.checker('token', '  1  2  3  \n', '1 2 3')
        self.assertTrue(ok)

    def test_token_wrong(self):
        ok, score, msg = self.checker('token', '1 2 4', '1 2 3')
        self.assertFalse(ok)

    # ── Float checker ──

    def test_float_exact(self):
        ok, score, msg = self.checker('float', '3.14159', '3.14159')
        self.assertTrue(ok)

    def test_float_within_tolerance(self):
        ok, score, msg = self.checker('float', '3.1415926535', '3.1415926536')
        self.assertTrue(ok)

    def test_float_out_of_tolerance(self):
        ok, score, msg = self.checker('float', '3.14', '3.15')
        self.assertFalse(ok)

    def test_float_multiple_values(self):
        ok, score, msg = self.checker('float', '1.0 2.0 3.0', '1.0 2.0 3.0')
        self.assertTrue(ok)

    def test_float_different_count(self):
        ok, score, msg = self.checker('float', '1.0 2.0', '1.0 2.0 3.0')
        self.assertFalse(ok)

    def test_float_invalid_output(self):
        ok, score, msg = self.checker('float', 'abc', '1.0')
        self.assertFalse(ok)
        self.assertIn('Invalid float', msg)

    # ── Unknown checker ──

    def test_unknown_checker(self):
        ok, score, msg = self.checker('nonexistent', '42', '42')
        self.assertFalse(ok)
        self.assertIn('Unknown', msg)


class TestCheckCodeSafety(unittest.TestCase):
    """Test check_code_safety() — static security analysis."""

    def setUp(self):
        from apps.submissions.judge_engine import check_code_safety
        self.check = check_code_safety

    def test_safe_python(self):
        code = 'import sys\nn = int(input())\nprint(n * 2)\n'
        safe, reason = self.check(code, 'python')
        self.assertTrue(safe)
        self.assertIsNone(reason)

    def test_unsafe_python_os(self):
        code = 'import os\nos.system("rm -rf /")\n'
        safe, reason = self.check(code, 'python')
        self.assertFalse(safe)
        self.assertIn('import os', reason)

    def test_unsafe_python_subprocess(self):
        code = 'import subprocess\nsubprocess.run(["ls"])\n'
        safe, reason = self.check(code, 'python')
        self.assertFalse(safe)

    def test_python_allowed_import(self):
        code = 'import sys\nfrom collections import deque\nprint(42)\n'
        safe, reason = self.check(code, 'python')
        self.assertTrue(safe)

    def test_safe_cpp(self):
        code = '#include <iostream>\nint main() { std::cout << 42; }'
        safe, reason = self.check(code, 'cpp')
        self.assertTrue(safe)

    def test_unsafe_cpp_system(self):
        code = '#include <cstdlib>\nint main() { system("ls"); }'
        safe, reason = self.check(code, 'cpp')
        self.assertFalse(safe)

    def test_safe_java(self):
        code = 'import java.util.Scanner;\npublic class Solution { }'
        safe, reason = self.check(code, 'java')
        self.assertTrue(safe)

    def test_unsafe_java_runtime(self):
        code = 'Runtime.getRuntime().exec("ls");'
        safe, reason = self.check(code, 'java')
        self.assertFalse(safe)

    def test_code_too_large(self):
        code = 'a' * 60_000
        safe, reason = self.check(code, 'python')
        self.assertFalse(safe)
        self.assertIn('50KB', reason)

    def test_too_many_lines(self):
        code = '\n'.join(['print(1)'] * 1100)
        safe, reason = self.check(code, 'python')
        self.assertFalse(safe)
        self.assertIn('1000', reason)

    def test_comment_line_ignored_python(self):
        code = '# import os\nprint(42)\n'
        safe, reason = self.check(code, 'python')
        self.assertTrue(safe)

    def test_comment_line_ignored_cpp(self):
        code = '// system("rm -rf /")\nint main() { return 0; }'
        safe, reason = self.check(code, 'cpp')
        self.assertTrue(safe)

    def test_safe_golang(self):
        code = 'package main\nimport "fmt"\nfunc main() { fmt.Println(42) }\n'
        safe, reason = self.check(code, 'golang')
        self.assertTrue(safe)

    def test_unsafe_golang_exec(self):
        code = 'import "os/exec"\n'
        safe, reason = self.check(code, 'golang')
        self.assertFalse(safe)

    def test_safe_pascal(self):
        code = "program hello;\nbegin\n  writeln('Hello');\nend.\n"
        safe, reason = self.check(code, 'pascal')
        self.assertTrue(safe)

    def test_safe_csharp(self):
        code = 'using System;\nclass Solution { static void Main() { Console.WriteLine(42); } }'
        safe, reason = self.check(code, 'csharp')
        self.assertTrue(safe)

    def test_unsafe_csharp_process(self):
        code = 'Process.Start("cmd");'
        safe, reason = self.check(code, 'csharp')
        self.assertFalse(safe)

    def test_pypy_same_as_python(self):
        code = 'import os\n'
        safe, reason = self.check(code, 'pypy')
        self.assertFalse(safe)

    def test_msvc_cpp_same_as_cpp(self):
        code = 'system("rm -rf /");'
        safe, reason = self.check(code, 'msvc_cpp')
        self.assertFalse(safe)


class TestBoxIdPool(unittest.TestCase):
    """Test BoxIdPool — Redis-based distributed lock."""

    def test_acquire_returns_int(self):
        mock_redis = MagicMock()
        mock_redis.set.return_value = True
        from apps.submissions.judge_engine import BoxIdPool
        pool = BoxIdPool(mock_redis)
        box_id = pool.acquire()
        self.assertIsInstance(box_id, int)
        self.assertGreaterEqual(box_id, 0)
        self.assertLess(box_id, BoxIdPool.MAX_BOX_ID)

    def test_acquire_skips_locked(self):
        mock_redis = MagicMock()
        # First 5 boxes locked, 6th available
        mock_redis.set.side_effect = [False] * 5 + [True]
        from apps.submissions.judge_engine import BoxIdPool
        pool = BoxIdPool(mock_redis)
        box_id = pool.acquire()
        self.assertEqual(box_id, 5)

    def test_release_deletes_key(self):
        mock_redis = MagicMock()
        from apps.submissions.judge_engine import BoxIdPool
        pool = BoxIdPool(mock_redis)
        pool.release(42)
        mock_redis.delete.assert_called_once_with('isolate:box:42')

    def test_acquire_timeout(self):
        mock_redis = MagicMock()
        mock_redis.set.return_value = False  # All boxes locked
        from apps.submissions.judge_engine import BoxIdPool
        pool = BoxIdPool(mock_redis)
        with self.assertRaises(RuntimeError):
            pool.acquire(timeout=0.5)


class TestLanguageConfigCompleteness(unittest.TestCase):
    """Verify all 9 languages are properly configured."""

    def test_all_languages_present(self):
        from apps.submissions.judge_engine import LANGUAGE_CONFIG
        expected = {
            'python', 'cpp', 'msvc_cpp', 'java', 'javascript',
            'golang', 'pascal', 'csharp', 'pypy',
        }
        self.assertEqual(set(LANGUAGE_CONFIG.keys()), expected)

    def test_all_have_required_keys(self):
        from apps.submissions.judge_engine import LANGUAGE_CONFIG
        required_keys = {'file', 'compile', 'run', 'extra_dirs', 'env',
                         'time_multiplier', 'memory_limit_kb'}
        for lang, config in LANGUAGE_CONFIG.items():
            for key in required_keys:
                self.assertIn(key, config, f'{lang} missing key: {key}')

    def test_compiled_have_compile_cmd(self):
        from apps.submissions.judge_engine import LANGUAGE_CONFIG
        compiled = {'cpp', 'msvc_cpp', 'java', 'golang', 'pascal', 'csharp'}
        for lang in compiled:
            self.assertIsNotNone(
                LANGUAGE_CONFIG[lang]['compile'],
                f'{lang} should have compile command'
            )

    def test_interpreted_have_no_compile(self):
        from apps.submissions.judge_engine import LANGUAGE_CONFIG
        interpreted = {'python', 'javascript', 'pypy'}
        for lang in interpreted:
            self.assertIsNone(
                LANGUAGE_CONFIG[lang]['compile'],
                f'{lang} should not have compile command'
            )

    def test_run_commands_are_lists(self):
        from apps.submissions.judge_engine import LANGUAGE_CONFIG
        for lang, config in LANGUAGE_CONFIG.items():
            self.assertIsInstance(
                config['run'], list,
                f'{lang} run command should be a list'
            )

    def test_time_multipliers_positive(self):
        from apps.submissions.judge_engine import LANGUAGE_CONFIG
        for lang, config in LANGUAGE_CONFIG.items():
            self.assertGreater(
                config['time_multiplier'], 0,
                f'{lang} time_multiplier should be positive'
            )


class TestCleanInput(unittest.TestCase):
    """Test _clean_input() — BOM removal and line ending normalization."""

    def setUp(self):
        from apps.submissions.judge_engine import _clean_input
        self.clean = _clean_input

    def test_empty(self):
        self.assertEqual(self.clean(''), '')

    def test_none(self):
        self.assertEqual(self.clean(''), '')

    def test_bom_removal(self):
        self.assertEqual(self.clean('\ufeffhello'), 'hello')

    def test_crlf_to_lf(self):
        self.assertEqual(self.clean('a\r\nb\r\n'), 'a\nb\n')

    def test_cr_to_lf(self):
        self.assertEqual(self.clean('a\rb'), 'a\nb')

    def test_normal_text_unchanged(self):
        self.assertEqual(self.clean('hello\nworld\n'), 'hello\nworld\n')


class TestCompareOutputs(unittest.TestCase):
    """Test legacy compare_outputs() wrapper."""

    def setUp(self):
        from apps.submissions.judge_engine import compare_outputs
        self.compare = compare_outputs

    def test_match(self):
        self.assertTrue(self.compare('42', '42'))

    def test_no_match(self):
        self.assertFalse(self.compare('41', '42'))

    def test_trailing_whitespace(self):
        self.assertTrue(self.compare('42  ', '42'))

    def test_multiline(self):
        self.assertTrue(self.compare('1\n2\n3', '1\n2\n3'))


class TestStatusPriority(unittest.TestCase):
    """Test STATUS_PRIORITY ordering."""

    def test_system_error_is_worst(self):
        from apps.submissions.judge_engine import STATUS_PRIORITY
        self.assertEqual(STATUS_PRIORITY[0], 'system_error')

    def test_accepted_is_best(self):
        from apps.submissions.judge_engine import STATUS_PRIORITY
        self.assertEqual(STATUS_PRIORITY[-1], 'accepted')

    def test_all_statuses_present(self):
        from apps.submissions.judge_engine import STATUS_PRIORITY
        expected = {
            'system_error', 'compilation_error', 'runtime_error',
            'time_limit_exceeded', 'memory_limit_exceeded',
            'wrong_answer', 'accepted',
        }
        self.assertEqual(set(STATUS_PRIORITY), expected)


if __name__ == '__main__':
    unittest.main()

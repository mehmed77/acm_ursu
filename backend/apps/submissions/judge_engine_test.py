"""
Isolate Sandbox Judge Engine — Production-Ready.

IOI/ICPC/Codeforces-grade judge engine using isolate sandbox.
Replaces Docker SDK approach with kernel-level isolation.

Architecture:
    judge_submission (Celery task)
        ├── _compile_submission()     → isolate --run compiler
        ├── _run_test_case()          → isolate --run executable
        └── _map_isolate_status()     → verdict mapping
"""
import os
import re
import time
import shutil
import logging
import threading
import subprocess
from dataclasses import dataclass, field
from typing import Optional, Tuple, List, Dict, Any

from django.conf import settings
from django.utils import timezone
from celery import shared_task, chord

logger = logging.getLogger('judge')

# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

ISOLATE_BIN: str = '/usr/local/bin/isolate'
ISOLATE_BOX_BASE: str = '/var/local/lib/isolate'

MAX_OUTPUT_BYTES: int = 4 * 1024 * 1024    # 4 MB stdout cap
MAX_STDERR_BYTES: int = 256 * 1024          # 256 KB stderr cap
MAX_CODE_LENGTH: int = 50_000               # 50 KB source code
MAX_CODE_LINES: int = 1000

STATUS_PRIORITY: List[str] = [
    'system_error', 'compilation_error', 'runtime_error',
    'time_limit_exceeded', 'memory_limit_exceeded',
    'wrong_answer', 'accepted',
]

STATUS_PRIORITY_MAP: Dict[str, int] = {s: i for i, s in enumerate(STATUS_PRIORITY)}

# ═══════════════════════════════════════════════════════════════════════════════
# LANGUAGE CONFIGURATION — All 9 languages
# ═══════════════════════════════════════════════════════════════════════════════

LANGUAGE_CONFIG: Dict[str, Dict[str, Any]] = {
    'python': {
        'file':             'solution.py',
        'compile':          None,
        'run':              ['/usr/bin/python3.13', '/box/solution.py'],
        'extra_dirs':       ['/usr', '/lib', '/lib64', '/usr/lib/python3.13', '/etc'],
        'env': {
            'PYTHONDONTWRITEBYTECODE': '1',
            'PYTHONUNBUFFERED': '1',
        },
        'time_multiplier':  3.0,
        'memory_limit_kb':  262144,
        'max_processes':    64,
    },
    'cpp': {
        'file':             'solution.cpp',
        'compile':          [
            '/usr/bin/g++', '-std=c++17', '-O2', '-DONLINE_JUDGE',
            '-o', '/box/solution', '/box/solution.cpp',
            '-lm', '-fmax-errors=3',
        ],
        'run':              ['/box/solution'],
        'extra_dirs':       ['/lib', '/lib64', '/usr', '/etc'],
        'env':              {},
        'time_multiplier':  1.0,
        'memory_limit_kb':  262144,
        'max_processes':    64,
    },
    'java': {
        'file':             'Solution.java',
        'compile':          ['/usr/bin/javac', '-encoding', 'UTF-8', '/box/Solution.java'],
        'run':              [
            '/usr/bin/java', 
            '-XX:CompressedClassSpaceSize=64m', 
            '-XX:MaxMetaspaceSize=128m', 
            '-Xmx256m', 
            '-Xss1m',
            '-DONLINE_JUDGE=true', 'Solution',
        ],
        'extra_dirs':       ['/usr/lib/jvm', '/lib', '/lib64', '/usr', '/etc'],
        'env':              {'JAVA_HOME': '/usr/lib/jvm/java-17-openjdk-amd64'},
        'time_multiplier':  2.0,
        'memory_limit_kb':  0,  # Disable Isolate RLIMIT_AS for JVM; rely on Docker limits
        'max_processes':    128,
    },
    'csharp': {
        'file':             'Solution.cs',
        'compile':          None,
        'run':              [
            '/usr/bin/dotnet-script', '/box/Solution.cs',
        ],
        'extra_dirs':       ['/usr/share/dotnet', '/usr/lib', '/lib', '/lib64', '/usr', '/etc', '/tmp'],
        'env':              {'DOTNET_CLI_TELEMETRY_OPTOUT': '1', 'HOME': '/tmp', 'DOTNET_ROOT': '/usr/share/dotnet'},
        'time_multiplier':  2.5,
        'memory_limit_kb':  0,  # Disable Isolate RLIMIT_AS for .NET core
        'max_processes':    128,
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
# ISOLATE BOX MANAGER
# ═══════════════════════════════════════════════════════════════════════════════

class IsolateBox:
    """
    Context manager for isolate sandbox lifecycle.

    Usage:
        with IsolateBox(box_id=1) as box:
            box.copy_file(source_code, 'code.py')
            result = box.run(
                cmd=['python3.13', '/box/code.py'],
                stdin='input data',
                time_limit=2.0,
                memory_limit=262144,
            )
    """

    def __init__(self, box_id: int) -> None:
        self.box_id: int = box_id
        self.box_dir: Optional[str] = None
        self.use_cg: bool = False

    def __enter__(self) -> 'IsolateBox':
        """Initialize isolate box, return self."""
        try:
            # Avval --cg bilan sinab ko'r (Linux production)
            result = subprocess.run(
                [ISOLATE_BIN, f'--box-id={self.box_id}', '--cg', '--init'],
                capture_output=True, text=True, timeout=10,
            )
            if result.returncode == 0:
                self.use_cg = True
                self.box_dir = result.stdout.strip() + '/box'

                # Smoke test: cgroups aslida ishlaydimi tekshir
                smoke = subprocess.run(
                    [ISOLATE_BIN, f'--box-id={self.box_id}', '--cg',
                     '--run', '--', '/bin/true'],
                    capture_output=True, text=True, timeout=5,
                )
                if smoke.returncode != 0 and 'cgroup' in smoke.stderr.lower():
                    # cgroups init ishladi lekin run ishlamaydi (Docker Desktop / WSL2)
                    logger.warning(
                        f'cgroups smoke test failed (box {self.box_id}): '
                        f'{smoke.stderr.strip()} — falling back to non-cg'
                    )
                    # Cleanup cg box, re-init without cg
                    subprocess.run(
                        [ISOLATE_BIN, f'--box-id={self.box_id}', '--cg', '--cleanup'],
                        capture_output=True, timeout=5,
                    )
                    result = subprocess.run(
                        [ISOLATE_BIN, f'--box-id={self.box_id}', '--init'],
                        capture_output=True, text=True, timeout=10,
                    )
                    if result.returncode != 0:
                        raise RuntimeError(
                            f'isolate --init failed (fallback): {result.stderr.strip()}'
                        )
                    self.use_cg = False
                    self.box_dir = result.stdout.strip() + '/box'
            else:
                # Fallback: --cg siz (Docker Desktop / development)
                result = subprocess.run(
                    [ISOLATE_BIN, f'--box-id={self.box_id}', '--init'],
                    capture_output=True, text=True, timeout=10,
                )
                if result.returncode != 0:
                    raise RuntimeError(
                        f'isolate --init failed: {result.stderr.strip()}'
                    )
                self.use_cg = False
                self.box_dir = result.stdout.strip() + '/box'

        except subprocess.TimeoutExpired:
            raise RuntimeError(f'isolate --init timed out (box {self.box_id})')
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Cleanup isolate box — always runs."""
        try:
            cg_flag = ['--cg'] if self.use_cg else []
            subprocess.run(
                [ISOLATE_BIN, f'--box-id={self.box_id}'] + cg_flag + ['--cleanup'],
                capture_output=True, timeout=10,
            )
        except Exception as e:
            logger.warning(f'isolate --cleanup failed (box {self.box_id}): {e}')

    def copy_file(self, content: str, filename: str, encoding: str = 'utf-8') -> None:
        """Write file into sandbox box directory."""
        if self.box_dir is None:
            raise RuntimeError('IsolateBox not initialized')
        path = os.path.join(self.box_dir, filename)
        with open(path, 'w', encoding=encoding) as f:
            f.write(content)
        os.chmod(path, 0o644)

    def copy_binary(self, src_path: str, dest_filename: str) -> None:
        """Copy a binary file into sandbox box directory."""
        if self.box_dir is None:
            raise RuntimeError('IsolateBox not initialized')
        dest_path = os.path.join(self.box_dir, dest_filename)
        shutil.copy2(src_path, dest_path)
        os.chmod(dest_path, 0o755)

    def run(
        self,
        cmd: List[str],
        stdin: str = '',
        time_limit: float = 2.0,
        wall_time_limit: float = 10.0,
        memory_limit: int = 262144,
        max_processes: int = 64,
        max_file_size: int = 16384,
        extra_dirs: Optional[List[str]] = None,
        env_vars: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Execute command inside isolate sandbox.

        Args:
            cmd: Command and arguments to execute.
            stdin: Input data string.
            time_limit: CPU time limit in seconds.
            wall_time_limit: Wall clock time limit in seconds.
            memory_limit: Memory limit in KB.
            max_processes: Maximum number of processes.
            max_file_size: Maximum output file size in KB.
            extra_dirs: Additional directories to mount read-only.
            env_vars: Environment variables to pass.

        Returns:
            Dict with keys: stdout, stderr, exit_code, time, wall_time,
            memory, status, message, exit_signal, killed.
        """
        if self.box_dir is None:
            raise RuntimeError('IsolateBox not initialized')

        meta_file = f'/tmp/isolate_meta_{self.box_id}.txt'

        # Write stdin to file inside box
        stdin_path = os.path.join(self.box_dir, 'stdin.txt')
        with open(stdin_path, 'w', encoding='utf-8') as f:
            f.write(stdin)

        # Build isolate command
        isolate_cmd = [ISOLATE_BIN, f'--box-id={self.box_id}']
        if self.use_cg:
            isolate_cmd.append('--cg')
            
        isolate_cmd.extend([
            '--run',
            f'--time={time_limit}',
            '--extra-time=0.5',
            f'--wall-time={wall_time_limit}',
        ])
        
        if memory_limit > 0:
            if self.use_cg:
                isolate_cmd.append(f'--cg-mem={memory_limit}')
            else:
                isolate_cmd.append(f'--mem={memory_limit}')
            isolate_cmd.append(f'--stack={min(memory_limit, 65536)}')

        isolate_cmd.extend([
            f'--fsize={max_file_size}',
            f'--processes={max_processes}',
            f'--meta={meta_file}',
            '--stdin=stdin.txt',
            '--stdout=stdout.txt',
            '--stderr=stderr.txt',
        ])

        # Extra directories (read-only mount)
        if extra_dirs:
            for d in extra_dirs:
                isolate_cmd.append(f'--dir={d}')

        # Environment variables — always include base vars
        isolate_cmd.extend([
            '--env=PATH=/usr/local/bin:/usr/bin:/bin',
            '--env=HOME=/tmp',
            '--env=LANG=en_US.UTF-8',
        ])
        if env_vars:
            for k, v in env_vars.items():
                isolate_cmd.append(f'--env={k}={v}')

        isolate_cmd.append('--')
        isolate_cmd.extend(cmd)

        # Execute with outer safety timeout
        try:
            proc = subprocess.run(
                isolate_cmd,
                capture_output=True, text=True,
                timeout=wall_time_limit + 5,
            )
        except subprocess.TimeoutExpired:
            return {
                'stdout': '', 'stderr': 'Wall time exceeded (outer timeout)',
                'exit_code': -1, 'time': wall_time_limit,
                'wall_time': wall_time_limit, 'memory': 0,
                'status': 'TO', 'message': 'Wall time limit exceeded',
                'exit_signal': None, 'killed': True,
            }

        # Parse meta file
        meta = self._parse_meta(meta_file)

        # Read output files
        stdout = self._read_box_file('stdout.txt', MAX_OUTPUT_BYTES)
        stderr = self._read_box_file('stderr.txt', MAX_STDERR_BYTES)

        return {
            'stdout':       stdout,
            'stderr':       stderr,
            'exit_code':    proc.returncode,
            'time':         meta.get('time', 0.0),
            'wall_time':    meta.get('time-wall', 0.0),
            'memory':       meta.get('cg-mem', meta.get('max-rss', 0)),
            'status':       meta.get('status', ''),
            'message':      meta.get('message', ''),
            'exit_signal':  meta.get('exitsig', None),
            'killed':       meta.get('killed', False),
        }

    def _read_box_file(self, filename: str, max_bytes: int) -> str:
        """Read a file from the box directory with size cap."""
        path = os.path.join(self.box_dir, filename)
        if not os.path.exists(path):
            return ''
        try:
            with open(path, 'r', encoding='utf-8', errors='replace') as f:
                return f.read(max_bytes)
        except Exception:
            return ''

    @staticmethod
    def _parse_meta(meta_file: str) -> Dict[str, Any]:
        """Parse isolate meta file into dict with type conversion."""
        meta: Dict[str, Any] = {}
        try:
            with open(meta_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if ':' in line:
                        key, _, val = line.partition(':')
                        try:
                            if '.' in val:
                                meta[key] = float(val)
                            else:
                                meta[key] = int(val)
                        except ValueError:
                            meta[key] = val
        except FileNotFoundError:
            pass
        return meta


# ═══════════════════════════════════════════════════════════════════════════════
# BOX ID POOL — Thread-safe, Redis-backed distributed lock
# ═══════════════════════════════════════════════════════════════════════════════

class BoxIdPool:
    """
    Thread-safe pool of isolate box IDs.
    Isolate supports box IDs 0-999.
    Each concurrent judging needs a unique box ID.
    Uses Redis SETNX for distributed locking.
    """

    MAX_BOX_ID: int = 100

    def __init__(self, redis_client: Any) -> None:
        self.redis = redis_client
        self._local = threading.local()

    def acquire(self, timeout: int = 30) -> int:
        """Acquire a free box ID using Redis SETNX with TTL."""
        start = time.time()
        while time.time() - start < timeout:
            for box_id in range(self.MAX_BOX_ID):
                key = f'isolate:box:{box_id}'
                if self.redis.set(key, '1', nx=True, ex=300):
                    self._local.box_id = box_id
                    return box_id
            time.sleep(0.1)
        raise RuntimeError('No available isolate box IDs — system overloaded')

    def release(self, box_id: int) -> None:
        """Release box ID back to pool."""
        self.redis.delete(f'isolate:box:{box_id}')


def _get_redis_client() -> Any:
    """Get Redis client from Django settings or default."""
    import redis as redis_lib
    redis_url = getattr(settings, 'CELERY_BROKER_URL', 'redis://localhost:6379/0')
    return redis_lib.from_url(redis_url)


# ═══════════════════════════════════════════════════════════════════════════════
# SECURITY — Static code analysis
# ═══════════════════════════════════════════════════════════════════════════════

BANNED_PATTERNS: Dict[str, List[str]] = {
    'python': [
        'import os', 'import subprocess', 'import socket',
        'import requests', 'import urllib', 'import shutil',
        '__import__', 'exec(', 'eval(', 'compile(',
        'open(', 'breakpoint', 'ctypes', 'pickle',
        'marshal', 'importlib',
    ],
    'cpp': [
        'system(', 'popen(', 'execve(', 'fork(',
        '#include <fstream>', '#include <filesystem>',
        'socket(', '__asm__', 'mmap(',
    ],
    'java': [
        'Runtime.getRuntime', 'ProcessBuilder',
        'System.exit', 'FileInputStream',
        'FileOutputStream', 'java.net', 'ClassLoader',
    ],
    'javascript': [
        'require(', 'process.', 'child_process',
        'fs.', 'net.', 'eval(', 'Function(',
    ],
    'pascal': [
        'exec(', 'fpassign', 'ShellExecute',
    ],
    'csharp': [
        'Process.Start', 'System.IO.File',
        'System.Net', 'System.Diagnostics',
    ],
    'golang': [
        'os/exec', 'net/http', 'syscall.',
    ],
    'pypy': [
        'import os', 'import subprocess', 'import socket',
        'import requests', 'import urllib', 'import shutil',
        '__import__', 'exec(', 'eval(', 'compile(',
        'open(', 'breakpoint', 'ctypes', 'pickle',
    ],
    'msvc_cpp': [
        'system(', 'popen(', 'execve(', 'fork(',
        '#include <fstream>', '#include <filesystem>',
        'socket(', '__asm__', 'mmap(',
    ],
}

PYTHON_ALLOWED_IMPORTS: List[str] = [
    'import sys', 'from sys import',
    'import math', 'from math import',
    'import collections', 'from collections import',
    'import heapq', 'import bisect',
    'import itertools', 'from itertools import',
    'import functools', 'from functools import',
    'import string', 'import re',
    'import copy', 'from copy import',
    'import random', 'import decimal', 'import fractions',
    'import operator', 'from operator import',
    'import io', 'from io import',
]


def check_code_safety(code: str, language: str) -> Tuple[bool, Optional[str]]:
    """
    Static analysis of user code for security violations.

    Args:
        code: Source code string.
        language: Programming language key.

    Returns:
        Tuple of (is_safe, reason_if_unsafe).
    """
    if len(code) > MAX_CODE_LENGTH:
        return False, 'Kod hajmi 50KB dan oshmasligi kerak'

    lines = code.split('\n')
    if len(lines) > MAX_CODE_LINES:
        return False, 'Kod 1000 qatordan oshmasligi kerak'

    banned = BANNED_PATTERNS.get(language, [])

    for line_num, line in enumerate(lines, 1):
        stripped = line.strip()
        if language in ('python', 'pypy') and stripped.startswith('#'):
            continue
        if language in ('cpp', 'msvc_cpp', 'java', 'javascript', 'golang', 'csharp') and stripped.startswith('//'):
            continue

        for pattern in banned:
            if pattern in line:
                if language in ('python', 'pypy'):
                    if any(a in line for a in PYTHON_ALLOWED_IMPORTS):
                        continue
                return False, (
                    f"Xavfsizlik xatosi ({line_num}-qator): "
                    f'"{pattern}" ruxsat etilmagan'
                )

    return True, None


# ═══════════════════════════════════════════════════════════════════════════════
# OUTPUT COMPARISON — IOI standard
# ═══════════════════════════════════════════════════════════════════════════════

def _outputs_match(actual: str, expected: str) -> bool:
    """
    IOI-style output comparison.
    - Trim trailing whitespace per line
    - Ignore trailing newlines
    - Case-sensitive
    """
    def normalize(s: str) -> List[str]:
        lines = s.rstrip('\n').split('\n')
        return [line.rstrip() for line in lines]

    return normalize(actual) == normalize(expected)


def compare_outputs(actual: str, expected: str) -> bool:
    """Legacy compatibility wrapper for _outputs_match."""
    return _outputs_match(actual.strip(), expected.strip())


# ═══════════════════════════════════════════════════════════════════════════════
# CHECKER SYSTEM — Xalqaro olimpiadalar standarti
# ═══════════════════════════════════════════════════════════════════════════════

def run_checker(
    checker_type: str,
    actual: str,
    expected: str,
    input_data: str = '',
) -> Tuple[bool, float, str]:
    """
    Run output checker based on checker type.

    Implements Testlib-compatible checker interface.

    Args:
        checker_type: 'exact', 'token', 'float', or 'special'.
        actual: Program output.
        expected: Expected output.
        input_data: Problem input (for special judges).

    Returns:
        Tuple of (is_accepted, score, message).
    """
    if checker_type == 'exact':
        ok = _outputs_match(actual, expected)
        return ok, 1.0 if ok else 0.0, 'OK' if ok else 'Wrong Answer'

    elif checker_type == 'token':
        actual_tokens = actual.split()
        expected_tokens = expected.split()
        ok = actual_tokens == expected_tokens
        return ok, 1.0 if ok else 0.0, 'OK' if ok else 'Wrong Answer'

    elif checker_type == 'float':
        try:
            actual_nums = [float(x) for x in actual.split()]
            expected_nums = [float(x) for x in expected.split()]
            if len(actual_nums) != len(expected_nums):
                return False, 0.0, 'Different number of values'
            for a, e in zip(actual_nums, expected_nums):
                if abs(a - e) > 1e-6 and abs(a - e) / max(abs(e), 1e-9) > 1e-6:
                    return False, 0.0, f'Value mismatch: got {a}, expected {e}'
            return True, 1.0, 'OK'
        except ValueError:
            return False, 0.0, 'Invalid float output'

    elif checker_type == 'special':
        return _run_special_checker(actual, expected, input_data)

    return False, 0.0, 'Unknown checker type'


def _run_special_checker(
    actual: str,
    expected: str,
    input_data: str,
) -> Tuple[bool, float, str]:
    """
    Run a custom checker program inside isolate.
    Checker receives input, expected, actual as files.
    Returns 0 for AC, 1 for WA, 2 for PE.

    Note: Checker binary must be pre-compiled and available.
    """
    logger.warning('Special checker called but no checker binary configured')
    return False, 0.0, 'Special checker not configured'


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def _clean_input(text: str) -> str:
    """Remove BOM and normalize line endings."""
    if not text:
        return ''
    text = text.lstrip('\ufeff')
    text = text.replace('\r\n', '\n')
    text = text.replace('\r', '\n')
    return text


def _get_java_class_name(code: str) -> str:
    """Extract public class name from Java source code."""
    match = re.search(r'public\s+class\s+(\w+)', code)
    return match.group(1) if match else 'Solution'


def _map_isolate_status(
    isolate_result: Dict[str, Any],
    expected_output: str,
    time_limit: float,
    memory_limit: int,
    checker_type: str = 'exact',
    input_data: str = '',
) -> str:
    """
    Map isolate execution result to judge status.

    Isolate 'status' field values:
        RE — Runtime Error (non-zero exit / signal)
        TO — Time limit exceeded (cpu or wall)
        SG — Killed by signal
        XX — Internal error
        (empty) — successful execution
    """
    status = isolate_result.get('status', '')

    if status == 'TO':
        return 'time_limit_exceeded'

    if status == 'XX':
        return 'system_error'

    if status in ('RE', 'SG'):
        return 'runtime_error'

    mem_used = isolate_result.get('memory', 0)
    if mem_used > memory_limit:
        return 'memory_limit_exceeded'

    if isolate_result.get('exit_code', 0) != 0:
        return 'runtime_error'

    # Compare output using checker
    is_accepted, score, message = run_checker(
        checker_type=checker_type,
        actual=isolate_result.get('stdout', ''),
        expected=expected_output,
        input_data=input_data,
    )

    if is_accepted:
        return 'accepted'

    return 'wrong_answer'


# ═══════════════════════════════════════════════════════════════════════════════
# METRICS — Observability
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class JudgeMetrics:
    """Structured metrics for judge execution."""
    submission_id: int
    language: str
    problem_id: int
    compile_time_ms: float = 0.0
    judge_time_ms: float = 0.0
    test_count: int = 0
    status: str = ''

    def log(self) -> None:
        """Log metrics for monitoring."""
        logger.info(
            'judge_complete | submission=%d lang=%s status=%s '
            'compile=%.1fms judge=%.1fms tests=%d',
            self.submission_id, self.language, self.status,
            self.compile_time_ms, self.judge_time_ms, self.test_count,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# CORE JUDGE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def _compile_submission(
    submission: Any,
    config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Compile source code inside isolate sandbox.

    Args:
        submission: Submission model instance.
        config: Language configuration dict.

    Returns:
        Dict with 'status' ('OK' or 'CE'), 'stderr', and optionally 'binary_path'.
    """
    box_pool = BoxIdPool(_get_redis_client())
    box_id = box_pool.acquire()

    try:
        with IsolateBox(box_id=box_id) as box:
            source_code = submission.code if hasattr(submission, 'code') else submission.source_code
            
            # Dynamically determine filename and compile command for Java
            file_name = config['file']
            compile_cmd = config['compile']
            if config.get('file', '').endswith('.java'):
                java_class = _get_java_class_name(source_code)
                file_name = f'{java_class}.java'
                if compile_cmd:
                    compile_cmd = [cmd.replace('Solution.java', file_name) for cmd in compile_cmd]
            elif config.get('file', '').endswith('.cs'):
                file_name = 'Solution.cs'
                
            box.copy_file(source_code, file_name)

            result = box.run(
                cmd=compile_cmd,
                stdin='',
                time_limit=30.0,
                wall_time_limit=60.0,
                memory_limit=0,  # No memory limit during compilation (JVM needs unrestricted mmap)
                max_processes=256,
                extra_dirs=config.get('extra_dirs', ['/usr', '/lib', '/lib64', '/usr/local']),
                env_vars={
                    'PATH': '/usr/local/bin:/usr/bin:/bin:/usr/local/go/bin',
                    'HOME': '/tmp',
                    **config.get('env', {}),
                },
            )

            if result['exit_code'] != 0 or result.get('status') in ('RE', 'SG', 'TO'):
                return {
                    'status': 'CE',
                    'stderr': (result['stderr'] or result['stdout'])[:4096],
                }

            return {'status': 'OK', 'binary_path': box.box_dir}
    except Exception as e:
        logger.error(f'Compile error (sub {getattr(submission, "id", "?")}): {e}')
        return {'status': 'CE', 'stderr': str(e)[:4096]}
    finally:
        box_pool.release(box_id)


def _run_test_case(
    submission: Any,
    test_case: Any,
    config: Dict[str, Any],
    time_limit: float,
    memory_limit: int,
    compiled_binary: Optional[str] = None,
    checker_type: str = 'exact',
) -> Dict[str, Any]:
    """
    Run single test case inside isolate sandbox.

    Args:
        submission: Submission model instance.
        test_case: TestCase model instance or dict with input/expected.
        config: Language configuration dict.
        time_limit: Effective time limit in seconds.
        memory_limit: Memory limit in KB.
        compiled_binary: Path to compiled binary (from compile step).
        checker_type: Checker type for output comparison.

    Returns:
        Dict with test result details.
    """
    box_pool = BoxIdPool(_get_redis_client())
    box_id = box_pool.acquire()

    # Extract test data (support both ORM objects and dicts)
    if isinstance(test_case, dict):
        tc_id = test_case.get('number', 0)
        tc_input = test_case.get('input', '')
        tc_expected = test_case.get('expected', test_case.get('output', ''))
    else:
        tc_id = test_case.id
        tc_input = test_case.input_data
        tc_expected = test_case.expected_output

    try:
        with IsolateBox(box_id=box_id) as box:
            source_code = submission.code if hasattr(submission, 'code') else submission.source_code
            
            # Dynamically determine filename and run command logic
            file_name = config['file']
            run_cmd = config['run']
            java_class = None
            
            if config.get('file', '').endswith('.java'):
                java_class = _get_java_class_name(source_code)
                file_name = f'{java_class}.java'
                if run_cmd:
                    run_cmd = [cmd.replace('Solution', java_class) for cmd in run_cmd]
            elif config.get('file', '').endswith('.cs'):
                file_name = 'Solution.cs'
                
            box.copy_file(source_code, file_name)

            if compiled_binary:
                # Determine binary filename
                if run_cmd and '/box/solution' in run_cmd[0]:
                    binary_name = 'solution'
                elif run_cmd and run_cmd[0] == '/usr/bin/mono':
                    binary_name = 'Solution.exe'
                elif run_cmd and run_cmd[0] == '/usr/bin/java':
                    binary_name = f'{java_class}.class'
                else:
                    binary_name = 'solution'

                binary_src = os.path.join(compiled_binary, binary_name)
                if os.path.exists(binary_src):
                    box.copy_binary(binary_src, binary_name)

                # For Java: also copy inner classes
                if java_class:
                    for f in os.listdir(compiled_binary):
                        if f.endswith('.class'):
                            src = os.path.join(compiled_binary, f)
                            box.copy_binary(src, f)

            result = box.run(
                cmd=run_cmd,
                stdin=_clean_input(tc_input),
                time_limit=time_limit,
                wall_time_limit=time_limit * 3 + 5,
                memory_limit=memory_limit,
                max_processes=config.get('max_processes', 64),
                extra_dirs=config.get('extra_dirs', ['/usr', '/lib', '/lib64']),
                env_vars={
                    'PATH': '/usr/local/bin:/usr/bin:/bin',
                    'HOME': '/tmp',
                    **config.get('env', {}),
                },
            )

            verdict = _map_isolate_status(
                isolate_result=result,
                expected_output=tc_expected,
                time_limit=time_limit,
                memory_limit=memory_limit,
                checker_type=checker_type,
                input_data=tc_input,
            )

            return {
                'test_case_id':  tc_id,
                'status':        verdict,
                'time':          result['time'],
                'wall_time':     result['wall_time'],
                'memory':        result['memory'],
                'exit_code':     result['exit_code'],
                'exit_signal':   result.get('exit_signal'),
                'stdout':        result['stdout'][:1024],
                'stderr':        result['stderr'][:512],
            }
    except Exception as e:
        import traceback
        logger.error(f'Test case error (sub {getattr(submission, "id", "?")}): {e}\n{traceback.format_exc()}')
        return {
            'test_case_id': tc_id,
            'status':       'system_error',
            'time':         0.0,
            'wall_time':    0.0,
            'memory':       0,
            'exit_code':    -1,
            'exit_signal':  None,
            'stdout':       '',
            'stderr':       str(e)[:512],
        }
    finally:
        box_pool.release(box_id)


# ═══════════════════════════════════════════════════════════════════════════════
# RUN MODE — Synchronous, DB-less (for /run/ endpoint)
# ═══════════════════════════════════════════════════════════════════════════════

def run_code_sync(
    code: str,
    language: str,
    test_cases: list,
    time_limit: float = 1.0,
    memory_limit: int = 256,
) -> Dict[str, Any]:
    """
    Synchronous code runner for the /run/ endpoint.
    Does NOT write to DB. Uses isolate sandbox.

    Args:
        code: Source code string.
        language: Language key.
        test_cases: List of TestCase objects (sample tests).
        time_limit: Time limit in seconds.
        memory_limit: Memory limit in MB.

    Returns:
        Dict with status, test_results, max_time, max_memory, error_message.
    """
    logger.info(
        f'[RUN] Sinxron test: {language} | {len(test_cases)} namuna test'
    )

    is_safe, reason = check_code_safety(code, language)
    if not is_safe:
        return {
            'status': 'SECURITY_VIOLATION',
            'test_results': [{
                'test_num': 1, 'status': 'SECURITY_VIOLATION',
                'input': '', 'expected': '', 'actual': '',
                'stderr': reason, 'time_ms': 0,
            }],
            'error_message': reason,
        }

    config = LANGUAGE_CONFIG.get(language)
    if not config:
        return {
            'status': 'SYSTEM_ERROR',
            'test_results': [],
            'error_message': f'Noma\'lum til: {language}',
        }

    effective_time = time_limit * config.get('time_multiplier', 1.0)
    effective_memory = config.get('memory_limit_kb', memory_limit * 1024)

    test_results: List[Dict[str, Any]] = []
    overall_status = 'ACCEPTED'
    max_time = 0
    max_memory = 0
    error_message: Optional[str] = None

    # Create a mock submission object for _compile_submission / _run_test_case
    class _MockSubmission:
        def __init__(self, code_str: str, lang: str) -> None:
            self.id = 0
            self.code = code_str
            self.source_code = code_str
            self.language = lang

    mock_sub = _MockSubmission(code, language)

    try:
        # Compile if needed
        compiled_binary = None
        if config['compile']:
            compile_result = _compile_submission(mock_sub, config)
            if compile_result['status'] != 'OK':
                return {
                    'status': 'COMPILATION_ERROR',
                    'test_results': [{
                        'test_num': 1, 'status': 'COMPILATION_ERROR',
                        'input': '', 'expected': '', 'actual': '',
                        'stderr': compile_result.get('stderr', ''), 'time_ms': 0,
                    }],
                    'error_message': compile_result.get('stderr', ''),
                }
            compiled_binary = compile_result.get('binary_path')

        # Run each test case
        for i, tc in enumerate(test_cases, 1):
            result = _run_test_case(
                submission=mock_sub,
                test_case=tc,
                config=config,
                time_limit=effective_time,
                memory_limit=effective_memory,
                compiled_binary=compiled_binary,
            )

            time_ms = int(result['time'] * 1000) if result['time'] else 0
            memory_mb = int(result['memory'] / 1024) if result['memory'] else 0

            # Get expected output
            if isinstance(tc, dict):
                tc_input = tc.get('input', '')
                tc_expected = tc.get('expected', tc.get('output', ''))
            else:
                tc_input = tc.input_data
                tc_expected = tc.expected_output

            status = result['status'].upper()

            res_item = {
                'test_num':   i,
                'status':     status,
                'input':      tc_input[:500],
                'expected':   tc_expected.strip()[:500],
                'actual':     result['stdout'].strip()[:500],
                'time_ms':    time_ms,
                'memory_mb':  memory_mb,
                'stderr':     result.get('stderr', '')[:500],
            }
            test_results.append(res_item)

            max_time = max(max_time, time_ms)
            max_memory = max(max_memory, memory_mb)

            if status != 'ACCEPTED':
                overall_status = status
                error_message = result.get('stderr', '')

    except Exception as e:
        logger.error(f'Run mode system error: {e}')
        return {
            'status': 'SYSTEM_ERROR',
            'test_results': [],
            'error_message': str(e),
        }

    return {
        'status':        overall_status,
        'test_results':  test_results,
        'max_time':      max_time,
        'max_memory':    max_memory,
        'error_message': error_message,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SUBMIT MODE — File-based test cases (main judge flow)
# ═══════════════════════════════════════════════════════════════════════════════

def _judge_submit_mode(submission: Any, problem: Any) -> Dict[str, Any]:
    """
    SUBMIT mode: run against file-based or DB test cases.
    ICPC-style: stop at first wrong answer.

    Args:
        submission: Submission model instance.
        problem: Problem model instance.

    Returns:
        Dict with status, time_used, memory_used, error_message, failed_test, test_results.
    """
    import os
    import glob

    slug = problem.slug
    base_dir = os.path.join(settings.BASE_DIR, 'testcases', slug)

    # Load test cases — prefer file-based, fallback to DB
    file_tests: List[Dict[str, Any]] = []
    if os.path.exists(base_dir):
        in_files = sorted(
            glob.glob(os.path.join(base_dir, '*.in')),
            key=lambda x: int(
                ''.join(filter(str.isdigit, os.path.basename(x))) or '0'
            )
        )
        for in_file in in_files:
            out_file = in_file.replace('.in', '.out')
            if not os.path.exists(out_file):
                continue
            try:
                with open(in_file, encoding='utf-8') as f:
                    inp = f.read()
                with open(out_file, encoding='utf-8') as f:
                    out = f.read()
                file_tests.append({
                    'input':     inp,
                    'output':    out,
                    'expected':  out,
                    'is_sample': False,
                    'number':    len(file_tests) + 1,
                })
            except Exception as e:
                logger.warning(f"Fayl o'qilmadi: {in_file}: {e}")

    if file_tests:
        logger.info(f'  📁 SUBMIT: {len(file_tests)} ta FAYL test ({slug}/)')
        test_cases = file_tests
    else:
        db_tests = list(problem.test_cases.all().order_by('file_number', 'id'))
        test_cases = [
            {
                'input': t.input_data,
                'expected': t.expected_output,
                'output': t.expected_output,
                'is_sample': t.is_sample,
                'number': i + 1,
            }
            for i, t in enumerate(db_tests)
        ]
        logger.warning(
            f'  ⚠ SUBMIT: Fayl topilmadi! {len(test_cases)} ta DB test.'
        )

    if not test_cases:
        return {'status': 'SYSTEM_ERROR', 'error_message': 'Test cases not found'}

    # Security check
    source_code = submission.code if hasattr(submission, 'code') else submission.source_code
    is_safe, reason = check_code_safety(source_code, submission.language)
    if not is_safe:
        return {
            'status': 'SECURITY_VIOLATION',
            'time_used': 0, 'memory_used': 0,
            'error_message': reason,
            'failed_test': {
                'number': 1, 'input': '', 'expected': '',
                'got': '', 'stderr': reason,
            },
        }

    config = LANGUAGE_CONFIG.get(submission.language)
    if not config:
        return {
            'status': 'SYSTEM_ERROR',
            'error_message': f"Noma'lum til: {submission.language}",
        }

    effective_time = float(problem.time_limit) * config.get('time_multiplier', 1.0)
    effective_memory = config.get('memory_limit_kb', problem.memory_limit * 1024)

    # Checker type (default: exact, use problem field if available)
    checker_type = getattr(problem, 'checker_type', 'exact') or 'exact'

    metrics = JudgeMetrics(
        submission_id=submission.id,
        language=submission.language,
        problem_id=problem.id,
        test_count=len(test_cases),
    )

    judge_start = time.time()

    try:
        # Compile
        compiled_binary = None
        if config['compile']:
            compile_start = time.time()
            compile_result = _compile_submission(submission, config)
            metrics.compile_time_ms = (time.time() - compile_start) * 1000

            if compile_result['status'] != 'OK':
                metrics.status = 'compilation_error'
                metrics.judge_time_ms = (time.time() - judge_start) * 1000
                metrics.log()
                return {
                    'status': 'COMPILATION_ERROR',
                    'time_used': 0, 'memory_used': 0,
                    'error_message': compile_result.get('stderr', ''),
                    'failed_test': {
                        'number': 1, 'input': 'N/A', 'expected': 'N/A',
                        'got': '', 'stderr': compile_result.get('stderr', ''),
                    },
                }
            compiled_binary = compile_result.get('binary_path')

        # Run tests — ICPC style (stop at first error)
        max_time = 0
        max_memory = 0
        all_results: List[Dict[str, Any]] = []

        for test in test_cases:
            result = _run_test_case(
                submission=submission,
                test_case=test,
                config=config,
                time_limit=effective_time,
                memory_limit=effective_memory,
                compiled_binary=compiled_binary,
                checker_type=checker_type,
            )
            all_results.append(result)

            time_ms = int(result['time'] * 1000) if result['time'] else 0
            memory_mb = int(result['memory'] / 1024) if result['memory'] else 0
            max_time = max(max_time, time_ms)
            max_memory = max(max_memory, memory_mb)

            if result['status'] != 'accepted':
                # Map status to upper case for compatibility
                status_upper = result['status'].upper()

                metrics.status = result['status']
                metrics.judge_time_ms = (time.time() - judge_start) * 1000
                metrics.log()

                return {
                    'status': status_upper,
                    'time_used': max_time,
                    'memory_used': max_memory,
                    'error_message': result.get('stderr', ''),
                    'test_results': all_results,
                    'failed_test': {
                        'number': test.get('number', 0) if isinstance(test, dict) else getattr(test, 'id', 0),
                        'input': (test.get('input', '')[:500] if isinstance(test, dict) and test.get('is_sample') else 'Hidden'),
                        'expected': (test.get('expected', test.get('output', ''))[:500] if isinstance(test, dict) and test.get('is_sample') else 'Hidden'),
                        'got': result['stdout'][:500],
                        'stderr': result['stderr'][:500],
                    },
                }

        # All tests passed
        metrics.status = 'accepted'
        metrics.judge_time_ms = (time.time() - judge_start) * 1000
        metrics.log()

        return {
            'status': 'ACCEPTED',
            'time_used': max_time,
            'memory_used': max_memory,
            'test_results': all_results,
        }

    except Exception as e:
        logger.error(f'Submit error (sub {submission.id}): {e}')
        metrics.status = 'system_error'
        metrics.judge_time_ms = (time.time() - judge_start) * 1000
        metrics.log()
        return {'status': 'SYSTEM_ERROR', 'error_message': str(e)}


def judge_submission(submission: Any) -> Dict[str, Any]:
    """
    Main entry point: judge a submission.
    Called by Celery task.

    Args:
        submission: Submission model instance with related problem.

    Returns:
        Dict with judge results.
    """
    return _judge_submit_mode(submission, submission.problem)


# ═══════════════════════════════════════════════════════════════════════════════
# IOI STYLE — Parallel test execution with subtask scoring
# ═══════════════════════════════════════════════════════════════════════════════

@shared_task(bind=True, max_retries=2, default_retry_delay=3)
def judge_ioi_style(self, submission_id: int) -> None:
    """
    IOI-style: Run ALL test cases, calculate partial score.
    Used for olympiad problems with subtasks.

    All test cases run regardless of individual results.
    Final score = sum of subtask scores where all tests in subtask pass.
    """
    from apps.submissions.models import Submission
    from apps.problems.models import TestCase

    try:
        submission = Submission.objects.select_related(
            'problem', 'user'
        ).get(id=submission_id)
    except Submission.DoesNotExist:
        logger.error(f'IOI judge: Submission {submission_id} not found')
        return

    submission.status = 'running'
    submission.save(update_fields=['status'])

    problem = submission.problem
    config = LANGUAGE_CONFIG.get(submission.language)

    if not config:
        submission.status = 'system_error'
        submission.save(update_fields=['status'])
        return

    test_cases = TestCase.objects.filter(
        problem=problem
    ).order_by('file_number', 'id')

    # Launch all test cases via chord
    tasks = [
        run_test_case_task.s(submission_id, tc.id)
        for tc in test_cases
    ]

    if tasks:
        chord(tasks)(aggregate_ioi_results.s(submission_id))
    else:
        submission.status = 'system_error'
        submission.error_message = 'No test cases found'
        submission.save()


@shared_task
def run_test_case_task(submission_id: int, test_case_id: int) -> Dict[str, Any]:
    """
    Single test case runner — designed for parallel execution.

    Args:
        submission_id: Submission ID.
        test_case_id: TestCase ID.

    Returns:
        Dict with test case result.
    """
    from apps.submissions.models import Submission
    from apps.problems.models import TestCase

    submission = Submission.objects.select_related('problem').get(id=submission_id)
    test_case = TestCase.objects.get(id=test_case_id)
    config = LANGUAGE_CONFIG.get(submission.language)

    if not config:
        return {
            'test_case_id': test_case_id,
            'status': 'system_error',
            'time': 0.0, 'wall_time': 0.0,
            'memory': 0, 'exit_code': -1,
        }

    problem = submission.problem
    effective_time = float(problem.time_limit) * config.get('time_multiplier', 1.0)
    effective_memory = config.get('memory_limit_kb', problem.memory_limit * 1024)
    checker_type = getattr(problem, 'checker_type', 'exact') or 'exact'

    return _run_test_case(
        submission=submission,
        test_case=test_case,
        config=config,
        time_limit=effective_time,
        memory_limit=effective_memory,
        compiled_binary=None,
        checker_type=checker_type,
    )


@shared_task
def aggregate_ioi_results(results: List[Dict[str, Any]], submission_id: int) -> None:
    """
    Aggregate all IOI test case results and compute final verdict + score.

    Args:
        results: List of test case result dicts from parallel execution.
        submission_id: Submission ID to update.
    """
    from apps.submissions.models import Submission

    try:
        submission = Submission.objects.get(id=submission_id)
    except Submission.DoesNotExist:
        logger.error(f'Aggregate: Submission {submission_id} not found')
        return

    all_accepted = all(r.get('status') == 'accepted' for r in results)

    if all_accepted:
        final_status = 'accepted'
    else:
        worst_idx = len(STATUS_PRIORITY)
        worst_status = 'accepted'
        for r in results:
            s = r.get('status', 'system_error')
            idx = STATUS_PRIORITY_MAP.get(s, 0)
            if idx < worst_idx:
                worst_idx = idx
                worst_status = s
        final_status = worst_status

    total_time = max((r.get('time', 0.0) for r in results), default=0.0)
    total_memory = max((r.get('memory', 0) for r in results), default=0)

    submission.status = final_status
    submission.time_used = round(total_time * 1000)
    submission.memory_used = round(total_memory / 1024)

    if hasattr(submission, 'test_results'):
        submission.test_results = results
    else:
        submission.extra_data = {'test_results': results}

    if hasattr(submission, 'finished_at'):
        submission.finished_at = timezone.now()

    submission.save()

    logger.info(
        f'IOI judge complete: sub={submission_id} status={final_status} '
        f'time={total_time:.3f}s mem={total_memory}KB'
    )

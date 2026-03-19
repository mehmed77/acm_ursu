"""
IOI/ICPC-Grade Judge Engine — 4 Language Support
=================================================
Supports: Python 3, C++ 17, Java 17, C# (Mono)

Architecture:
    COMPILE → outside isolate (temp dir /tmp/compile_XXX/)
    RUN     → inside isolate sandbox (kernel-level isolation)

This separation eliminates the binary-transfer bug where
isolate --cleanup destroys compiled files before they can be copied.
"""

import os
import re
import time
import shutil
import logging
import tempfile
import threading
import subprocess
from dataclasses import dataclass
from typing import Optional, Tuple, List, Dict, Any

from django.conf import settings
from django.utils import timezone
from celery import shared_task

logger = logging.getLogger('judge')

# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

ISOLATE_BIN: str = '/usr/local/bin/isolate'

MAX_OUTPUT_BYTES: int = 4 * 1024 * 1024   # 4 MB
MAX_STDERR_BYTES: int = 256 * 1024         # 256 KB
MAX_CODE_LENGTH:  int = 50_000             # 50 KB
MAX_CODE_LINES:   int = 1_000

# ═══════════════════════════════════════════════════════════════════════════════
# LANGUAGE CONFIGURATION — 4 languages
# ═══════════════════════════════════════════════════════════════════════════════

LANGUAGE_CONFIG: Dict[str, Dict[str, Any]] = {

    'python': {
        'file':            'solution.py',
        'compile':         None,  # interpreted — no compile step
        'run':             ['/usr/bin/python3.13', '/box/solution.py'],
        'extra_dirs':      ['/usr', '/lib', '/lib64', '/usr/lib/python3.13'],
        'env':             {
            'PYTHONDONTWRITEBYTECODE': '1',
            'PYTHONUNBUFFERED': '1',
        },
        'time_multiplier': 3.0,
        'memory_limit_kb': 262144,   # 256 MB
        'max_processes':   32,
    },

    'cpp': {
        'file':            'solution.cpp',
        'compile':         [
            '/usr/bin/g++', '-std=c++17', '-O2', '-DONLINE_JUDGE',
            '-o', '{binary}',   # {binary} replaced with actual path at runtime
            '{source}',         # {source} replaced with actual path at runtime
            '-lm', '-fmax-errors=5',
        ],
        'binary_name':     'solution',
        'run':             ['/box/solution'],
        'extra_dirs':      ['/lib', '/lib64'],
        'env':             {},
        'time_multiplier': 1.0,
        'memory_limit_kb': 262144,
        'max_processes':   32,
    },

    'java': {
        'file':            'Solution.java',   # javac requires filename = class name
        'compile':         [
            '/usr/bin/javac', '-encoding', 'UTF-8',
            '-d', '{outdir}',   # output directory for .class files
            '{source}',
        ],
        'run':             [
            '/usr/lib/jvm/java-17-openjdk-amd64/bin/java',
            '-Xss64m', '-Xmx256m',
            '-DONLINE_JUDGE=true',
            'Solution',
        ],
        'extra_dirs':      ['/usr/lib/jvm', '/usr/lib/jvm/java-17-openjdk-amd64', '/lib', '/lib64', '/usr'],
        'env':             {
            'JAVA_HOME':   '/usr/lib/jvm/java-17-openjdk-amd64',
            'JAVA_TOOL_OPTIONS': '-Dfile.encoding=UTF-8',
        },
        'time_multiplier': 2.0,
        'memory_limit_kb': 524288,   # 512 MB (JVM overhead)
        'max_processes':   64,        # JVM spawns threads
    },

    'csharp': {
        'file':            'Solution.cs',
        'compile':         [
            '/usr/bin/mcs',
            '-out:{binary}',    # {binary} replaced at runtime
            '{source}',
        ],
        'binary_name':     'Solution.exe',
        'run':             ['/usr/bin/mono', '/box/Solution.exe'],
        'extra_dirs':      ['/usr/lib/mono', '/usr/share/mono', '/lib', '/lib64', '/usr'],
        'env':             {
            'MONO_GC_PARAMS': 'max-heap-size=256m',
            'HOME':           '/tmp',
        },
        'time_multiplier': 2.0,
        'memory_limit_kb': 524288,
        'max_processes':   64,
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
# SECURITY — Static code analysis
# ═══════════════════════════════════════════════════════════════════════════════

BANNED_PATTERNS: Dict[str, List[str]] = {
    'python': [
        'import os', 'import subprocess', 'import socket',
        'import requests', 'import urllib', 'import shutil',
        '__import__', 'exec(', 'eval(', 'compile(',
        'open(', 'breakpoint', 'ctypes', 'pickle', 'marshal',
    ],
    'cpp': [
        'system(', 'popen(', 'execve(', 'fork(',
        'socket(', '__asm__', 'mmap(',
    ],
    'java': [
        'Runtime.getRuntime', 'ProcessBuilder',
        'System.exit', 'FileInputStream', 'FileOutputStream',
        'java.net.', 'ClassLoader',
    ],
    'csharp': [
        'Process.Start', 'System.IO.File',
        'System.Net', 'System.Diagnostics.Process',
    ],
}

PYTHON_ALLOWED_IMPORTS: List[str] = [
    'import sys', 'from sys import',
    'import math', 'from math import',
    'import collections', 'from collections import',
    'import heapq', 'import bisect',
    'import itertools', 'from itertools import',
    'import functools', 'from functools import',
    'import string', 'import re', 'import copy',
    'import random', 'import decimal', 'import fractions',
    'import operator', 'from operator import',
    'import io', 'from io import',
    'import typing', 'from typing import',
    'import queue', 'import array',
]


def check_code_safety(code: str, language: str) -> Tuple[bool, Optional[str]]:
    if len(code) > MAX_CODE_LENGTH:
        return False, 'Kod hajmi 50KB dan oshmasligi kerak'

    lines = code.split('\n')
    if len(lines) > MAX_CODE_LINES:
        return False, 'Kod 1000 qatordan oshmasligi kerak'

    banned = BANNED_PATTERNS.get(language, [])

    for line_num, line in enumerate(lines, 1):
        stripped = line.strip()
        # Skip comments
        if language == 'python' and stripped.startswith('#'):
            continue
        if language in ('cpp', 'java', 'csharp') and stripped.startswith('//'):
            continue

        for pattern in banned:
            if pattern in line:
                if language == 'python':
                    if any(a in line for a in PYTHON_ALLOWED_IMPORTS):
                        continue
                return False, (
                    f'Xavfsizlik xatosi ({line_num}-qator): '
                    f'"{pattern}" ruxsat etilmagan'
                )

    return True, None


# ═══════════════════════════════════════════════════════════════════════════════
# OUTPUT COMPARISON
# ═══════════════════════════════════════════════════════════════════════════════

def _outputs_match(actual: str, expected: str) -> bool:
    """IOI-style: trim trailing whitespace per line, ignore trailing newlines."""
    def normalize(s: str) -> List[str]:
        return [line.rstrip() for line in s.rstrip('\n').split('\n')]
    return normalize(actual) == normalize(expected)


def _clean_input(text: str) -> str:
    """Remove BOM and normalize line endings."""
    if not text:
        return ''
    text = text.lstrip('\ufeff')
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    return text


def _get_java_class_name(code: str) -> str:
    """Extract public class name from Java code."""
    match = re.search(r'public\s+class\s+(\w+)', code)
    return match.group(1) if match else 'Solution'


# ═══════════════════════════════════════════════════════════════════════════════
# BOX ID POOL — Thread-safe, Redis-backed
# ═══════════════════════════════════════════════════════════════════════════════

class BoxIdPool:
    MAX_BOX_ID = 100

    def __init__(self, redis_client: Any) -> None:
        self.redis = redis_client
        self._local = threading.local()

    def acquire(self, timeout: int = 30) -> int:
        start = time.time()
        while time.time() - start < timeout:
            for box_id in range(self.MAX_BOX_ID):
                key = f'isolate:box:{box_id}'
                if self.redis.set(key, '1', nx=True, ex=300):
                    self._local.box_id = box_id
                    return box_id
            time.sleep(0.1)
        raise RuntimeError('No available isolate box IDs')

    def release(self, box_id: int) -> None:
        self.redis.delete(f'isolate:box:{box_id}')


def _get_redis_client() -> Any:
    import redis as redis_lib
    redis_url = getattr(settings, 'CELERY_BROKER_URL', 'redis://localhost:6379/0')
    return redis_lib.from_url(redis_url)


# ═══════════════════════════════════════════════════════════════════════════════
# ISOLATE BOX — Sandbox for code EXECUTION (not compilation)
# ═══════════════════════════════════════════════════════════════════════════════

class IsolateBox:
    """
    Context manager for isolate sandbox lifecycle.
    Used ONLY for running code (not compiling).
    
    Gracefully falls back from --cg (cgroup) mode to regular mode
    for Docker Desktop / development environments.
    """

    def __init__(self, box_id: int) -> None:
        self.box_id:  int  = box_id
        self.box_dir: Optional[str] = None
        self.use_cg:  bool = False

    def __enter__(self) -> 'IsolateBox':
        # Try cgroup mode first (Linux production)
        result = subprocess.run(
            [ISOLATE_BIN, f'--box-id={self.box_id}', '--cg', '--init'],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0:
            self.use_cg = True
            self.box_dir = result.stdout.strip() + '/box'
            return self

        # Fallback: without cgroup (Docker Desktop, Windows/Mac dev)
        logger.warning(
            f'isolate --cg not available (box {self.box_id}), '
            f'falling back to non-cgroup mode: {result.stderr.strip()}'
        )
        result = subprocess.run(
            [ISOLATE_BIN, f'--box-id={self.box_id}', '--init'],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode != 0:
            raise RuntimeError(
                f'isolate --init failed (box {self.box_id}): {result.stderr.strip()}'
            )
        self.use_cg = False
        self.box_dir = result.stdout.strip() + '/box'
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        cg = ['--cg'] if self.use_cg else []
        try:
            subprocess.run(
                [ISOLATE_BIN, f'--box-id={self.box_id}'] + cg + ['--cleanup'],
                capture_output=True, timeout=10,
            )
        except Exception as e:
            logger.warning(f'isolate --cleanup failed (box {self.box_id}): {e}')

    def copy_file(self, content: str, filename: str, encoding: str = 'utf-8') -> None:
        path = os.path.join(self.box_dir, filename)
        with open(path, 'w', encoding=encoding) as f:
            f.write(content)
        os.chmod(path, 0o644)

    def copy_binary(self, src_path: str, dest_filename: str) -> None:
        dest = os.path.join(self.box_dir, dest_filename)
        shutil.copy2(src_path, dest)
        os.chmod(dest, 0o755)

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
        if self.box_dir is None:
            raise RuntimeError('IsolateBox not initialized')

        meta_file   = f'/tmp/isolate_meta_{self.box_id}.txt'
        stdin_path  = os.path.join(self.box_dir, 'stdin.txt')
        stdout_path = os.path.join(self.box_dir, 'stdout.txt')
        stderr_path = os.path.join(self.box_dir, 'stderr.txt')

        with open(stdin_path, 'w', encoding='utf-8') as f:
            f.write(stdin)

        isolate_cmd = [
            ISOLATE_BIN,
            f'--box-id={self.box_id}',
        ]
        if self.use_cg:
            isolate_cmd.append('--cg')

        isolate_cmd += [
            '--run',
            f'--time={time_limit}',
            '--extra-time=0.5',
            f'--wall-time={wall_time_limit}',
            f'--stack={min(memory_limit, 65536)}',
            f'--fsize={max_file_size}',
            f'--processes={max_processes}',
            f'--meta={meta_file}',
            '--stdin=stdin.txt',
            '--stdout=stdout.txt',
            '--stderr=stderr.txt',
        ]

        if self.use_cg:
            isolate_cmd.append(f'--cg-mem={memory_limit}')
        else:
            isolate_cmd.append(f'--mem={memory_limit}')

        if extra_dirs:
            for d in extra_dirs:
                if os.path.exists(d):
                    isolate_cmd.append(f'--dir={d}')

        env_vars = env_vars or {}
        base_env = {
            'PATH':   '/usr/local/bin:/usr/bin:/bin',
            'HOME':   '/tmp',
            'LANG':   'en_US.UTF-8',
            'LC_ALL': 'en_US.UTF-8',
        }
        merged_env = {**base_env, **env_vars}
        for k, v in merged_env.items():
            isolate_cmd.append(f'--env={k}={v}')

        isolate_cmd.append('--')
        isolate_cmd.extend(cmd)

        try:
            proc = subprocess.run(
                isolate_cmd,
                capture_output=True, text=True,
                timeout=wall_time_limit + 5,
            )
        except subprocess.TimeoutExpired:
            return {
                'stdout': '', 'stderr': 'Wall time exceeded',
                'exit_code': -1, 'time': wall_time_limit,
                'wall_time': wall_time_limit, 'memory': 0,
                'status': 'TO', 'message': 'Wall time limit exceeded',
                'exit_signal': None, 'killed': True,
            }

        meta   = self._parse_meta(meta_file)
        stdout = self._read_box_file('stdout.txt', MAX_OUTPUT_BYTES)
        stderr = self._read_box_file('stderr.txt', MAX_STDERR_BYTES)

        return {
            'stdout':      stdout,
            'stderr':      stderr,
            'exit_code':   proc.returncode,
            'time':        meta.get('time', 0.0),
            'wall_time':   meta.get('time-wall', 0.0),
            'memory':      meta.get('cg-mem', meta.get('max-rss', 0)),
            'status':      meta.get('status', ''),
            'message':     meta.get('message', ''),
            'exit_signal': meta.get('exitsig', None),
            'killed':      meta.get('killed', False),
        }

    def _read_box_file(self, filename: str, max_bytes: int) -> str:
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
        meta: Dict[str, Any] = {}
        try:
            with open(meta_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if ':' in line:
                        key, _, val = line.partition(':')
                        try:
                            meta[key] = float(val) if '.' in val else int(val)
                        except ValueError:
                            meta[key] = val
        except FileNotFoundError:
            pass
        return meta


# ═══════════════════════════════════════════════════════════════════════════════
# COMPILE — Outside isolate, into temp directory
# ═══════════════════════════════════════════════════════════════════════════════

def _compile_code(
    source_code: str,
    language: str,
    config: Dict[str, Any],
    submission_id: int = 0,
) -> Dict[str, Any]:
    """
    Compile source code OUTSIDE isolate into a temp directory.
    
    Returns:
        {
          'status':   'OK' | 'CE',
          'stderr':   str,
          'work_dir': str | None,   ← temp dir with compiled binary (caller must clean up)
        }
    """
    if config['compile'] is None:
        return {'status': 'OK', 'stderr': '', 'work_dir': None}

    work_dir = tempfile.mkdtemp(prefix=f'judge_{submission_id}_')
    try:
        # Write source file
        source_filename = config['file']
        source_path     = os.path.join(work_dir, source_filename)

        with open(source_path, 'w', encoding='utf-8') as f:
            f.write(source_code)

        # Build compile command — substitute {binary}, {source}, {outdir}
        binary_name = config.get('binary_name', 'solution')
        binary_path = os.path.join(work_dir, binary_name)

        compile_cmd = []
        for part in config['compile']:
            part = part.replace('{binary}',  binary_path)
            part = part.replace('{source}',  source_path)
            part = part.replace('{outdir}',  work_dir)
            # Handle -out:{binary} style (mcs)
            part = part.replace('{binary}',  binary_path)
            compile_cmd.append(part)

        logger.info(f'[COMPILE] sub={submission_id} lang={language} cmd={compile_cmd[0]}')

        result = subprocess.run(
            compile_cmd,
            capture_output=True, text=True,
            timeout=30,
        )

        if result.returncode != 0:
            shutil.rmtree(work_dir, ignore_errors=True)
            error_output = (result.stderr or result.stdout)[:4096]
            logger.info(f'[COMPILE] sub={submission_id} COMPILATION_ERROR: {error_output[:200]}')
            return {
                'status':   'CE',
                'stderr':   error_output,
                'work_dir': None,
            }

        logger.info(f'[COMPILE] sub={submission_id} OK → {work_dir}')
        return {
            'status':   'OK',
            'stderr':   '',
            'work_dir': work_dir,
        }

    except subprocess.TimeoutExpired:
        shutil.rmtree(work_dir, ignore_errors=True)
        return {
            'status':   'CE',
            'stderr':   'Kompilyatsiya vaqti oshdi (30s)',
            'work_dir': None,
        }
    except Exception as e:
        shutil.rmtree(work_dir, ignore_errors=True)
        logger.error(f'[COMPILE] sub={submission_id} exception: {e}')
        return {
            'status':   'CE',
            'stderr':   str(e),
            'work_dir': None,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# RUN — Single test case inside isolate
# ═══════════════════════════════════════════════════════════════════════════════

def _run_one_test(
    source_code: str,
    language:    str,
    config:      Dict[str, Any],
    tc_input:    str,
    tc_expected: str,
    time_limit:  float,
    memory_limit: int,
    work_dir:    Optional[str],
    box_pool:    BoxIdPool,
) -> Dict[str, Any]:
    """
    Run one test case inside isolate sandbox.
    
    work_dir: directory with compiled binary (None for interpreted languages).
    """
    box_id = box_pool.acquire(timeout=30)
    try:
        with IsolateBox(box_id=box_id) as box:

            # --- Copy source / binary into box ---
            if config['compile'] is None:
                # Interpreted: copy source
                box.copy_file(source_code, config['file'])

            elif work_dir:
                # Compiled: copy binary files from work_dir
                if language == 'java':
                    # Copy all .class files
                    class_files = [f for f in os.listdir(work_dir) if f.endswith('.class')]
                    if not class_files:
                        return _error_result('Kompilyatsiya mahsuloti topilmadi (.class)')
                    for cls_file in class_files:
                        src = os.path.join(work_dir, cls_file)
                        box.copy_binary(src, cls_file)

                else:
                    # Copy single binary
                    binary_name = config.get('binary_name', 'solution')
                    binary_src  = os.path.join(work_dir, binary_name)
                    if not os.path.exists(binary_src):
                        return _error_result(f'Binary topilmadi: {binary_name}')
                    box.copy_binary(binary_src, binary_name)

            else:
                return _error_result('work_dir mavjud emas')

            # --- Execute ---
            wall_time = time_limit * 3 + 5

            result = box.run(
                cmd          = config['run'],
                stdin        = _clean_input(tc_input),
                time_limit   = time_limit,
                wall_time_limit = wall_time,
                memory_limit = memory_limit,
                max_processes= config.get('max_processes', 32),
                extra_dirs   = config.get('extra_dirs', ['/usr', '/lib', '/lib64']),
                env_vars     = config.get('env', {}),
            )

            # --- Verdict ---
            status = result.get('status', '')
            exit_code = result.get('exit_code', 0)
            time_used = result.get('time', 0.0)
            mem_used  = result.get('memory', 0)

            if status == 'TO':
                verdict = 'time_limit_exceeded'
            elif status == 'XX':
                verdict = 'system_error'
            elif status in ('RE', 'SG') or exit_code not in (0, 1):
                verdict = 'runtime_error'
            elif mem_used > memory_limit:
                verdict = 'memory_limit_exceeded'
            elif exit_code != 0:
                verdict = 'runtime_error'
            else:
                verdict = 'accepted' if _outputs_match(result['stdout'], tc_expected) else 'wrong_answer'

            return {
                'status':    verdict,
                'time':      time_used,
                'memory':    mem_used,
                'exit_code': exit_code,
                'stdout':    result['stdout'][:1024],
                'stderr':    result['stderr'][:512],
            }

    except Exception as e:
        logger.error(f'[RUN] box={box_id} exception: {e}')
        return _error_result(str(e))
    finally:
        box_pool.release(box_id)


def _error_result(msg: str) -> Dict[str, Any]:
    return {
        'status': 'system_error', 'time': 0.0, 'memory': 0,
        'exit_code': -1, 'stdout': '', 'stderr': msg,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# RUN MODE — /run/ endpoint (no DB write)
# ═══════════════════════════════════════════════════════════════════════════════

def run_code_sync(
    code:         str,
    language:     str,
    test_cases:   list,
    time_limit:   float = 2.0,
    memory_limit: int   = 256,
) -> Dict[str, Any]:
    """
    Synchronous runner for /run/ endpoint.
    Runs ONLY sample test cases. Does NOT write to DB.
    """
    logger.info(f'[RUN_SYNC] lang={language} tests={len(test_cases)}')

    is_safe, reason = check_code_safety(code, language)
    if not is_safe:
        return {
            'status': 'SECURITY_VIOLATION',
            'test_results': [],
            'error_message': reason,
        }

    config = LANGUAGE_CONFIG.get(language)
    if not config:
        return {
            'status': 'SYSTEM_ERROR',
            'test_results': [],
            'error_message': f"Noma'lum til: {language}",
        }

    # Fix Java filename to match class name
    if language == 'java':
        class_name = _get_java_class_name(code)
        config = {**config, 'file': f'{class_name}.java'}
        run_cmd = list(config['run'])
        run_cmd[-1] = class_name  # replace 'Solution' with actual class
        config = {**config, 'run': run_cmd}

    eff_time   = time_limit   * config['time_multiplier']
    eff_memory = config['memory_limit_kb']

    # Compile
    compile_result = _compile_code(code, language, config, submission_id=0)
    if compile_result['status'] != 'OK':
        return {
            'status': 'COMPILATION_ERROR',
            'time_used': 0,
            'memory_used': 0,
            'test_results': [{
                'test_num': 1, 'status': 'COMPILATION_ERROR',
                'input': '', 'expected': '', 'actual': '',
                'time_ms': 0, 'memory_mb': 0,
                'stderr': compile_result['stderr'],
            }],
            'error_message': compile_result['stderr'],
        }

    work_dir = compile_result.get('work_dir')
    box_pool = BoxIdPool(_get_redis_client())
    results  = []
    overall  = 'ACCEPTED'
    max_time = 0
    max_mem  = 0

    try:
        for i, tc in enumerate(test_cases, 1):
            if isinstance(tc, dict):
                tc_input    = tc.get('input', '')
                tc_expected = tc.get('expected', tc.get('output', ''))
            else:
                tc_input    = tc.input_data
                tc_expected = tc.expected_output

            res = _run_one_test(
                source_code  = code,
                language     = language,
                config       = config,
                tc_input     = tc_input,
                tc_expected  = tc_expected,
                time_limit   = eff_time,
                memory_limit = eff_memory,
                work_dir     = work_dir,
                box_pool     = box_pool,
            )

            status = res['status'].upper()
            if status != 'ACCEPTED':
                overall = status

            time_ms = int(res['time'] * 1000)
            mem_mb  = int(res['memory'] / 1024)
            max_time = max(max_time, time_ms)
            max_mem  = max(max_mem, mem_mb)

            results.append({
                'test_num':  i,
                'status':    status,
                'input':     tc_input[:500],
                'expected':  tc_expected.strip()[:500],
                'actual':    res['stdout'].strip()[:500],
                'time_ms':   time_ms,
                'memory_mb': mem_mb,
                'stderr':    res['stderr'][:300],
            })

    finally:
        if work_dir:
            shutil.rmtree(work_dir, ignore_errors=True)

    return {
        'status':       overall,
        'time_used':    max_time,
        'memory_used':  max_mem,
        'test_results': results,
        'error_message': None,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SUBMIT MODE — Full judge with all test cases
# ═══════════════════════════════════════════════════════════════════════════════

def _judge_submit_mode(submission: Any, problem: Any) -> Dict[str, Any]:
    """
    ICPC-style: compile once, run all tests, stop at first failure.
    Reads test cases from files (testcases/{slug}/*.in/out) or DB.
    """
    import glob

    language = submission.language
    config   = LANGUAGE_CONFIG.get(language)
    if not config:
        return {'status': 'SYSTEM_ERROR', 'error_message': f"Noma'lum til: {language}"}

    source_code = getattr(submission, 'source_code', getattr(submission, 'code', ''))

    # Fix Java class name
    if language == 'java':
        class_name = _get_java_class_name(source_code)
        run_cmd = list(config['run'])
        run_cmd[-1] = class_name
        config = {**config, 'file': f'{class_name}.java', 'run': run_cmd}

    eff_time   = problem.time_limit   * config['time_multiplier']
    eff_memory = config['memory_limit_kb']

    # Load test cases
    test_cases: List[Dict[str, Any]] = []
    slug     = problem.slug
    base_dir = os.path.join(settings.BASE_DIR, 'testcases', slug)

    if os.path.exists(base_dir):
        in_files = sorted(
            glob.glob(os.path.join(base_dir, '*.in')),
            key=lambda x: int(''.join(filter(str.isdigit, os.path.basename(x))) or '0'),
        )
        for in_file in in_files:
            out_file = in_file.replace('.in', '.out')
            if not os.path.exists(out_file):
                continue
            try:
                test_cases.append({
                    'input':    open(in_file, encoding='utf-8').read(),
                    'expected': open(out_file, encoding='utf-8').read(),
                    'number':   len(test_cases) + 1,
                    'is_sample': False,
                })
            except Exception as e:
                logger.warning(f"Test fayl o'qilmadi: {in_file}: {e}")

    if not test_cases:
        for i, t in enumerate(problem.test_cases.all().order_by('file_number', 'id'), 1):
            test_cases.append({
                'input':     t.input_data,
                'expected':  t.expected_output,
                'number':    i,
                'is_sample': t.is_sample,
            })

    if not test_cases:
        return {'status': 'SYSTEM_ERROR', 'error_message': 'Test case topilmadi'}

    logger.info(f'[SUBMIT] sub={submission.id} lang={language} tests={len(test_cases)}')

    # Compile
    compile_result = _compile_code(source_code, language, config, submission.id)
    if compile_result['status'] != 'OK':
        return {
            'status':        'COMPILATION_ERROR',
            'time_used':     0,
            'memory_used':   0,
            'error_message': compile_result['stderr'],
            'compile_output': compile_result['stderr'],
        }

    work_dir = compile_result.get('work_dir')
    box_pool = BoxIdPool(_get_redis_client())
    max_time = 0
    max_mem  = 0

    try:
        for tc in test_cases:
            res = _run_one_test(
                source_code  = source_code,
                language     = language,
                config       = config,
                tc_input     = tc['input'],
                tc_expected  = tc['expected'],
                time_limit   = eff_time,
                memory_limit = eff_memory,
                work_dir     = work_dir,
                box_pool     = box_pool,
            )

            time_ms = int(res['time'] * 1000)
            mem_mb  = int(res['memory'] / 1024)
            max_time = max(max_time, time_ms)
            max_mem  = max(max_mem, mem_mb)

            if res['status'] != 'accepted':
                verdict = res['status'].upper()
                logger.info(f'[SUBMIT] sub={submission.id} → {verdict} on test {tc["number"]}')
                return {
                    'status':      verdict,
                    'time_used':   max_time,
                    'memory_used': max_mem,
                    'error_message': res['stderr'],
                    'failed_test': {
                        'number':   tc['number'],
                        'input':    tc['input'][:500] if tc.get('is_sample') else 'Hidden',
                        'expected': tc['expected'][:500] if tc.get('is_sample') else 'Hidden',
                        'got':      res['stdout'][:500],
                        'stderr':   res['stderr'][:500],
                    },
                }

        logger.info(f'[SUBMIT] sub={submission.id} → ACCEPTED ({len(test_cases)} tests)')
        return {
            'status':      'ACCEPTED',
            'time_used':   max_time,
            'memory_used': max_mem,
        }

    except Exception as e:
        logger.error(f'[SUBMIT] sub={submission.id} exception: {e}')
        return {'status': 'SYSTEM_ERROR', 'error_message': str(e)}
    finally:
        if work_dir:
            shutil.rmtree(work_dir, ignore_errors=True)


def judge_submission(submission: Any) -> Dict[str, Any]:
    """Main entry point called by Celery task."""
    return _judge_submit_mode(submission, submission.problem)


# ═══════════════════════════════════════════════════════════════════════════════
# CELERY TASK
# ═══════════════════════════════════════════════════════════════════════════════

@shared_task(bind=True, max_retries=2, default_retry_delay=5)
def judge_submission_task(self, submission_id: int) -> None:
    """
    Celery task: judge a submission.
    Updates submission status in DB.
    """
    from apps.submissions.models import Submission

    try:
        submission = Submission.objects.select_related('problem', 'user').get(id=submission_id)
    except Submission.DoesNotExist:
        logger.error(f'[TASK] Submission {submission_id} not found')
        return

    try:
        submission.status = 'running'
        submission.save(update_fields=['status'])

        result = judge_submission(submission)
        status = result['status'].lower()

        # Map uppercase statuses to model choices
        STATUS_MAP = {
            'accepted':             'accepted',
            'wrong_answer':         'wrong_answer',
            'time_limit_exceeded':  'time_limit_exceeded',
            'memory_limit_exceeded':'memory_limit_exceeded',
            'runtime_error':        'runtime_error',
            'compilation_error':    'compilation_error',
            'system_error':         'system_error',
        }
        submission.status      = STATUS_MAP.get(status, 'system_error')
        submission.time_used   = result.get('time_used', 0)
        submission.memory_used = result.get('memory_used', 0)
        submission.finished_at = timezone.now()

        # Save compile output if available
        if hasattr(submission, 'compile_output') and result.get('compile_output'):
            submission.compile_output = result['compile_output'][:10000]

        submission.save()

        logger.info(
            f'[TASK] sub={submission_id} → {submission.status} '
            f'({submission.time_used}ms, {submission.memory_used}MB)'
        )

    except Exception as e:
        logger.error(f'[TASK] sub={submission_id} critical error: {e}')
        try:
            submission.status = 'system_error'
            submission.save(update_fields=['status'])
        except Exception:
            pass
        raise self.retry(exc=e)

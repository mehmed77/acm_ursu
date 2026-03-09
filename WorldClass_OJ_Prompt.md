# 🏆 WORLD-CLASS ONLINE JUDGE SYSTEM — MASTER PROMPT
> Professional AI prompt for building an IOI/ICPC/Codeforces-grade online judge

---

## SYSTEM IDENTITY

You are a **Senior Systems Architect** specializing in competitive programming infrastructure.
You have deep knowledge of:
- IOI (International Olympiad in Informatics) judge system internals
- Codeforces, AtCoder, USACO, ICPC judge architectures
- Linux kernel-level sandboxing (cgroups, namespaces, seccomp)
- Isolate sandbox (https://github.com/ioi/isolate) — the gold standard
- High-concurrency distributed systems
- Django REST Framework, Celery, Redis, Docker

You are building the judge engine for an online platform that must handle
**international-scale programming olympiads** with thousands of concurrent users.
Security, correctness, and fairness are non-negotiable.

---

## PROJECT CONTEXT

### Existing Stack (DO NOT CHANGE)
```
Backend:   Django 4.x + Django REST Framework
Task Queue: Celery + Redis
Container:  Docker (judge runs inside Docker sandbox)
Database:   PostgreSQL
Frontend:   React (JSX)
Auth:       JWT + HEMIS OAuth
```

### Existing Files to MODIFY (not replace):
```
backend/apps/submissions/judge_engine.py  ← CORE — replace subprocess with isolate
backend/apps/submissions/models.py        ← Language enum expansion
docker/judge/Dockerfile                   ← Add isolate + new compilers
```

### Languages to Support (9 languages, final list):
```python
LANGUAGES = {
    'python':     {'runtime': 'python3.13',   'compile': False},
    'cpp':        {'runtime': 'g++',           'compile': True,  'std': 'c++17'},
    'java':       {'runtime': 'java',          'compile': True},
    'javascript': {'runtime': 'node',          'compile': False, 'version': '20.x'},
    'pascal':     {'runtime': 'fpc',           'compile': True},
    'csharp':     {'runtime': 'dotnet',        'compile': True},
    'golang':     {'runtime': 'go',            'compile': True,  'version': '1.22'},
    'pypy':       {'runtime': 'pypy3',         'compile': False},
    'msvc_cpp':   {'runtime': 'g++',           'compile': True,  'std': 'c++17'},
    # Note: Delphi, PascalABC, VB.NET — REMOVED from scope
}
```

---

## TASK 1 — DOCKERFILE (docker/judge/Dockerfile)

### Requirements:
Build a **production-grade** Docker image based on `ubuntu:22.04` that includes:

#### 1.1 Isolate Installation (CRITICAL — this is the entire point)
```
Source: https://github.com/ioi/isolate
Build from source — do NOT use apt package (outdated)
Required kernel modules: cgroups v2
Required packages: libcap-dev, pkg-config
Make target: make install
Config file: /usr/local/etc/isolate
Cgroup directory: /sys/fs/cgroup
```

#### 1.2 Compilers/Runtimes (exact versions):
```
python3.13          → deadsnakes PPA: ppa:deadsnakes/ppa
g++ (GCC 12+)       → apt: g++-12, set as default via update-alternatives
openjdk-17-jdk      → apt: openjdk-17-jdk-headless
node 20.x           → NodeSource: https://deb.nodesource.com/setup_20.x
fpc (Free Pascal)   → apt: fpc
dotnet-sdk-8.0      → Microsoft APT repo (for C#)
go 1.22.x           → Download from https://go.dev/dl/go1.22.4.linux-amd64.tar.gz
pypy3.11            → Official binary from https://downloads.python.org/pypy/
```

#### 1.3 Security hardening:
```dockerfile
# Non-root user for judge execution
RUN useradd -m -s /bin/bash judgeuser

# Disable network access by default (isolate handles this)
# Remove dangerous utilities
RUN rm -f /usr/bin/wget /usr/bin/curl /usr/bin/nc /usr/bin/ncat

# Read-only /sandbox by default, isolate creates its own box
RUN mkdir -p /sandbox && chmod 755 /sandbox
```

#### 1.4 Performance optimization:
```dockerfile
# Pre-compile Python .pyc cache
RUN python3.13 -m compileall /usr/lib/python3.13/

# JVM warm-up (reduces cold start)
ENV JAVA_OPTS="-server -XX:+TieredCompilation -XX:TieredStopAtLevel=1"

# Go build cache
ENV GOCACHE=/tmp/go-cache
ENV GOPATH=/tmp/gopath
ENV GOPROXY=off
ENV GONOSUMDB=*
```

---

## TASK 2 — JUDGE ENGINE (judge_engine.py)

### Architecture Overview:
```
SubmissionTask (Celery)
    │
    ├── _compile(submission)          # For compiled languages
    │       └── isolate --run compiler
    │
    ├── _run_all_tests(submission)    # Celery group → parallel
    │       └── _run_single_test(submission, test_case)
    │               └── isolate --run executable
    │
    └── _judge_result(expected, actual, checker)
            ├── exact_match           # Default
            ├── token_match           # Floating point problems
            └── special_judge        # Custom checker (future)
```

### 2.1 Isolate Integration (CORE IMPLEMENTATION)

Replace ALL `subprocess.run` calls with `isolate`. Here is the exact API:

```python
import subprocess
import os
import shutil
import tempfile

ISOLATE_BIN = '/usr/local/bin/isolate'
ISOLATE_BOX_BASE = '/var/local/lib/isolate'

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
                memory_limit=262144,  # KB
            )
    """
    
    def __init__(self, box_id: int):
        self.box_id = box_id
        self.box_dir = None
    
    def __enter__(self):
        # Initialize isolate box
        result = subprocess.run(
            [ISOLATE_BIN, f'--box-id={self.box_id}', '--init'],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode != 0:
            raise RuntimeError(f'isolate --init failed: {result.stderr}')
        self.box_dir = result.stdout.strip()  # e.g. /var/local/lib/isolate/1/box
        return self
    
    def __exit__(self, *args):
        # Cleanup isolate box
        subprocess.run(
            [ISOLATE_BIN, f'--box-id={self.box_id}', '--cleanup'],
            capture_output=True, timeout=10
        )
    
    def copy_file(self, content: str, filename: str, encoding='utf-8'):
        """Write file into sandbox box directory."""
        path = os.path.join(self.box_dir, filename)
        with open(path, 'w', encoding=encoding) as f:
            f.write(content)
        os.chmod(path, 0o644)
    
    def run(
        self,
        cmd: list,
        stdin: str = '',
        time_limit: float = 2.0,
        wall_time_limit: float = 10.0,
        memory_limit: int = 262144,       # KB (256 MB default)
        max_processes: int = 64,
        max_file_size: int = 16384,       # KB (16 MB)
        enable_network: bool = False,
        extra_dirs: list = None,          # ['/usr', '/lib', '/lib64']
        env_vars: dict = None,
    ) -> dict:
        """
        Execute command inside isolate sandbox.
        
        Returns:
            {
                'stdout': str,
                'stderr': str,
                'exit_code': int,
                'time': float,       # CPU time in seconds
                'wall_time': float,  # Wall time in seconds
                'memory': int,       # Memory in KB
                'status': str,       # 'OK', 'TO' (timeout), 'MO' (memout), 'RE', 'XX'
                'message': str,      # Isolate message
            }
        """
        meta_file = f'/tmp/isolate_meta_{self.box_id}.txt'
        
        isolate_cmd = [
            ISOLATE_BIN,
            f'--box-id={self.box_id}',
            '--run',
            f'--time={time_limit}',
            f'--extra-time=0.5',          # Grace period before SIGKILL
            f'--wall-time={wall_time_limit}',
            f'--mem={memory_limit}',
            f'--stack={min(memory_limit, 65536)}',  # Stack limit
            f'--fsize={max_file_size}',
            f'--processes={max_processes}',
            f'--meta={meta_file}',
            '--stdout=stdout.txt',
            '--stderr=stderr.txt',
        ]
        
        # Network control
        if not enable_network:
            isolate_cmd.append('--no-cg-timing')  # Use cgroup for accurate timing
        
        # Extra directories (for runtime libraries)
        if extra_dirs:
            for d in extra_dirs:
                isolate_cmd.append(f'--dir={d}')
        
        # Environment variables
        if env_vars:
            for k, v in env_vars.items():
                isolate_cmd.append(f'--env={k}={v}')
        else:
            # Minimal safe environment
            isolate_cmd.extend([
                '--env=PATH=/usr/local/bin:/usr/bin:/bin',
                '--env=HOME=/tmp',
                '--env=LANG=en_US.UTF-8',
            ])
        
        isolate_cmd.append('--')
        isolate_cmd.extend(cmd)
        
        # Write stdin file
        stdin_path = os.path.join(self.box_dir, 'stdin.txt')
        with open(stdin_path, 'w', encoding='utf-8') as f:
            f.write(stdin)
        
        # Redirect stdin from file
        isolate_cmd_with_stdin = [ISOLATE_BIN, f'--box-id={self.box_id}', '--run',
                                   f'--time={time_limit}', f'--extra-time=0.5',
                                   f'--wall-time={wall_time_limit}', f'--mem={memory_limit}',
                                   f'--stack={min(memory_limit, 65536)}', f'--fsize={max_file_size}',
                                   f'--processes={max_processes}', f'--meta={meta_file}',
                                   '--stdin=stdin.txt', '--stdout=stdout.txt', '--stderr=stderr.txt']
        if not enable_network:
            isolate_cmd_with_stdin.append('--no-cg-timing')
        if extra_dirs:
            for d in extra_dirs:
                isolate_cmd_with_stdin.append(f'--dir={d}')
        if env_vars:
            for k, v in env_vars.items():
                isolate_cmd_with_stdin.append(f'--env={k}={v}')
        else:
            isolate_cmd_with_stdin.extend([
                '--env=PATH=/usr/local/bin:/usr/bin:/bin',
                '--env=HOME=/tmp', '--env=LANG=en_US.UTF-8',
            ])
        isolate_cmd_with_stdin.append('--')
        isolate_cmd_with_stdin.extend(cmd)
        
        try:
            proc = subprocess.run(
                isolate_cmd_with_stdin,
                capture_output=True, text=True,
                timeout=wall_time_limit + 5,  # Outer safety timeout
                cwd=self.box_dir
            )
        except subprocess.TimeoutExpired:
            return {
                'stdout': '', 'stderr': 'Wall time exceeded (outer)',
                'exit_code': -1, 'time': wall_time_limit,
                'wall_time': wall_time_limit, 'memory': 0,
                'status': 'TO', 'message': 'Wall time limit exceeded'
            }
        
        # Parse meta file
        meta = self._parse_meta(meta_file)
        
        # Read output files
        stdout_path = os.path.join(self.box_dir, 'stdout.txt')
        stderr_path = os.path.join(self.box_dir, 'stderr.txt')
        
        stdout = ''
        stderr = ''
        if os.path.exists(stdout_path):
            with open(stdout_path, 'r', encoding='utf-8', errors='replace') as f:
                stdout = f.read(4 * 1024 * 1024)  # Max 4MB output
        if os.path.exists(stderr_path):
            with open(stderr_path, 'r', encoding='utf-8', errors='replace') as f:
                stderr = f.read(256 * 1024)  # Max 256KB stderr
        
        return {
            'stdout': stdout,
            'stderr': stderr,
            'exit_code': proc.returncode,
            'time': meta.get('time', 0.0),
            'wall_time': meta.get('time-wall', 0.0),
            'memory': meta.get('max-rss', 0),
            'status': meta.get('status', 'OK'),
            'message': meta.get('message', ''),
            'exit_signal': meta.get('exitsig', None),
            'killed': meta.get('killed', False),
        }
    
    def _parse_meta(self, meta_file: str) -> dict:
        """Parse isolate meta file into dict."""
        meta = {}
        try:
            with open(meta_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if ':' in line:
                        key, _, val = line.partition(':')
                        # Type conversion
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
```

### 2.2 Language Configuration

```python
# judge_engine.py — Language configuration table
# All paths are inside the Docker container

LANGUAGE_CONFIG = {
    'python': {
        'file':    'solution.py',
        'compile': None,  # Interpreted
        'run':     ['/usr/bin/python3.13', '/box/solution.py'],
        'extra_dirs': ['/usr', '/lib', '/lib64', '/usr/lib/python3.13'],
        'env': {
            'PYTHONDONTWRITEBYTECODE': '1',
            'PYTHONUNBUFFERED': '1',
        },
        'time_multiplier': 3.0,   # Python is slow → 3x time limit
        'memory_limit_kb': 262144,
    },
    'cpp': {
        'file':    'solution.cpp',
        'compile': [
            '/usr/bin/g++', '-std=c++17', '-O2', '-DONLINE_JUDGE',
            '-o', '/box/solution', '/box/solution.cpp',
            '-lm', '-fmax-errors=3'
        ],
        'run':     ['/box/solution'],
        'extra_dirs': ['/lib', '/lib64'],
        'env': {},
        'time_multiplier': 1.0,
        'memory_limit_kb': 262144,
    },
    'msvc_cpp': {  # Alias for cpp — same compiler, different label
        'file':    'solution.cpp',
        'compile': [
            '/usr/bin/g++', '-std=c++17', '-O2', '-DONLINE_JUDGE',
            '-o', '/box/solution', '/box/solution.cpp',
            '-lm', '-fmax-errors=3'
        ],
        'run':     ['/box/solution'],
        'extra_dirs': ['/lib', '/lib64'],
        'env': {},
        'time_multiplier': 1.0,
        'memory_limit_kb': 262144,
    },
    'java': {
        'file':    'Solution.java',
        'compile': ['/usr/bin/javac', '-encoding', 'UTF-8', '/box/Solution.java'],
        'run':     [
            '/usr/bin/java',
            '-Xss64m',           # Stack size
            '-Xmx256m',          # Max heap
            '-DONLINE_JUDGE=true',
            'Solution'
        ],
        'extra_dirs': ['/usr/lib/jvm', '/lib', '/lib64'],
        'env': {'JAVA_HOME': '/usr/lib/jvm/java-17-openjdk-amd64'},
        'time_multiplier': 2.0,   # JVM startup overhead
        'memory_limit_kb': 524288, # 512MB for JVM overhead
        'max_processes': 128,      # JVM needs more threads
    },
    'javascript': {
        'file':    'solution.js',
        'compile': None,
        'run':     ['/usr/local/bin/node', '--max-old-space-size=256', '/box/solution.js'],
        'extra_dirs': ['/usr/local/lib/node_modules', '/lib', '/lib64'],
        'env': {'NODE_PATH': '/usr/local/lib/node_modules'},
        'time_multiplier': 2.5,
        'memory_limit_kb': 262144,
    },
    'golang': {
        'file':    'solution.go',
        'compile': [
            '/usr/local/go/bin/go', 'build',
            '-o', '/box/solution',
            '/box/solution.go'
        ],
        'run':     ['/box/solution'],
        'extra_dirs': ['/usr/local/go', '/lib', '/lib64'],
        'env': {
            'GOPATH':   '/tmp/gopath',
            'GOCACHE':  '/tmp/go-cache',
            'GOPROXY':  'off',
            'GONOSUMDB': '*',
            'HOME':     '/tmp',
        },
        'time_multiplier': 1.0,
        'memory_limit_kb': 262144,
    },
    'pascal': {
        'file':    'solution.pas',
        'compile': [
            '/usr/bin/fpc', '-O2', '-XS',
            '-o/box/solution',
            '/box/solution.pas'
        ],
        'run':     ['/box/solution'],
        'extra_dirs': ['/lib', '/lib64'],
        'env': {},
        'time_multiplier': 1.0,
        'memory_limit_kb': 262144,
    },
    'csharp': {
        'file':    'solution.cs',
        'compile': [
            '/usr/bin/dotnet-script',  # OR: mcs -out:/box/solution.exe /box/solution.cs
            'build', '--configuration', 'Release',
        ],
        'run':     ['/usr/bin/dotnet', '/box/solution.dll'],
        'extra_dirs': ['/usr/share/dotnet', '/lib', '/lib64'],
        'env': {'DOTNET_CLI_TELEMETRY_OPTOUT': '1', 'HOME': '/tmp'},
        'time_multiplier': 2.0,
        'memory_limit_kb': 524288,
        'max_processes': 128,
    },
    'pypy': {
        'file':    'solution.py',
        'compile': None,
        'run':     ['/opt/pypy3.11/bin/pypy3', '/box/solution.py'],
        'extra_dirs': ['/opt/pypy3.11', '/lib', '/lib64'],
        'env': {'HOME': '/tmp'},
        'time_multiplier': 1.5,  # PyPy faster than CPython
        'memory_limit_kb': 524288,
    },
}
```

### 2.3 Box ID Management (Critical for concurrency)

```python
import threading
import redis

class BoxIdPool:
    """
    Thread-safe pool of isolate box IDs.
    Isolate supports box IDs 0-999.
    Each Celery worker needs a unique box ID.
    
    Strategy: Redis-based distributed lock
    """
    
    MAX_BOX_ID = 100  # Support up to 100 concurrent judgings
    
    def __init__(self, redis_client):
        self.redis = redis_client
        self._local = threading.local()
    
    def acquire(self, timeout=30) -> int:
        """Acquire a free box ID using Redis SETNX."""
        import time
        start = time.time()
        while time.time() - start < timeout:
            for box_id in range(self.MAX_BOX_ID):
                key = f'isolate:box:{box_id}'
                # Try to acquire with 5 minute TTL (safety)
                if self.redis.set(key, '1', nx=True, ex=300):
                    self._local.box_id = box_id
                    return box_id
            time.sleep(0.1)
        raise RuntimeError('No available isolate box IDs (system overloaded)')
    
    def release(self, box_id: int):
        """Release box ID back to pool."""
        self.redis.delete(f'isolate:box:{box_id}')
```

### 2.4 Complete Judge Flow

```python
import logging
from celery import shared_task, group
from django.utils import timezone

logger = logging.getLogger('judge')

@shared_task(bind=True, max_retries=2, default_retry_delay=3)
def judge_submission(self, submission_id: int):
    """
    Main Celery task: judge a submission against all test cases.
    
    Flow:
    1. Load submission + problem + test cases
    2. Compile (if needed) — inside isolate
    3. Run all test cases in parallel (Celery group)
    4. Aggregate results
    5. Update submission + trigger rating update
    """
    from apps.submissions.models import Submission, SubmissionStatus
    from apps.problems.models import TestCase
    
    try:
        submission = Submission.objects.select_related(
            'problem', 'user'
        ).get(id=submission_id)
    except Submission.DoesNotExist:
        logger.error(f'Submission {submission_id} not found')
        return
    
    submission.status = 'running'
    submission.save(update_fields=['status'])
    
    problem = submission.problem
    language = submission.language
    config = LANGUAGE_CONFIG.get(language)
    
    if not config:
        submission.status = 'system_error'
        submission.save()
        return
    
    # ─── STEP 1: COMPILE ──────────────────────
    compiled_binary = None
    if config['compile']:
        compile_result = _compile_submission(submission, config)
        if compile_result['status'] != 'OK':
            submission.status = 'compilation_error'
            submission.compile_output = compile_result.get('stderr', '')[:4096]
            submission.save()
            return
        compiled_binary = compile_result.get('binary_path')
    
    # ─── STEP 2: RUN ALL TEST CASES ───────────
    test_cases = TestCase.objects.filter(
        problem=problem
    ).order_by('order')
    
    time_limit   = problem.time_limit     # seconds
    memory_limit = problem.memory_limit   # KB
    
    # Apply language multipliers
    effective_time   = time_limit * config.get('time_multiplier', 1.0)
    effective_memory = config.get('memory_limit_kb', memory_limit)
    
    results = []
    worst_status = 'accepted'
    total_time = 0.0
    total_memory = 0
    
    STATUS_PRIORITY = [
        'system_error', 'compilation_error', 'runtime_error',
        'time_limit_exceeded', 'memory_limit_exceeded',
        'wrong_answer', 'accepted'
    ]
    
    for tc in test_cases:
        result = _run_test_case(
            submission=submission,
            test_case=tc,
            config=config,
            time_limit=effective_time,
            memory_limit=effective_memory,
            compiled_binary=compiled_binary,
        )
        results.append(result)
        
        total_time   = max(total_time, result['time'])
        total_memory = max(total_memory, result['memory'])
        
        # Track worst status (status_priority order)
        if STATUS_PRIORITY.index(result['status']) < STATUS_PRIORITY.index(worst_status):
            worst_status = result['status']
        
        # EARLY EXIT: On first wrong/error, stop (like Codeforces default)
        # Comment this block for IOI-style (run all test cases)
        if result['status'] != 'accepted':
            break
    
    # ─── STEP 3: SAVE RESULTS ─────────────────
    submission.status         = worst_status
    submission.time_used      = round(total_time * 1000)   # ms
    submission.memory_used    = round(total_memory / 1024) # MB
    submission.test_results   = results  # JSONField
    submission.finished_at    = timezone.now()
    submission.save()
    
    logger.info(
        f'Submission {submission_id}: {worst_status} '
        f'({total_time:.3f}s, {total_memory}KB)'
    )
    
    # ─── STEP 4: TRIGGER RATING UPDATE ────────
    if submission.contest:
        from apps.contests.tasks import update_contest_standings
        update_contest_standings.delay(submission.contest_id)


def _compile_submission(submission, config: dict) -> dict:
    """Compile source code inside isolate sandbox."""
    
    box_pool = BoxIdPool(get_redis_client())
    box_id = box_pool.acquire()
    
    try:
        with IsolateBox(box_id=box_id) as box:
            # Write source code
            box.copy_file(submission.source_code, config['file'])
            
            # Compile with generous time limit
            result = box.run(
                cmd=config['compile'],
                stdin='',
                time_limit=30.0,        # 30s compile timeout
                wall_time_limit=60.0,
                memory_limit=512 * 1024, # 512MB for compiler
                max_processes=256,       # Compilers spawn many processes
                extra_dirs=['/usr', '/lib', '/lib64', '/usr/local'],
                env_vars={
                    'PATH': '/usr/local/bin:/usr/bin:/bin:/usr/local/go/bin',
                    'HOME': '/tmp',
                    **config.get('env', {}),
                },
            )
            
            if result['exit_code'] != 0:
                return {
                    'status': 'CE',
                    'stderr': result['stderr'] or result['stdout'],
                }
            
            return {'status': 'OK', 'binary_path': box.box_dir}
    finally:
        box_pool.release(box_id)


def _run_test_case(
    submission,
    test_case,
    config: dict,
    time_limit: float,
    memory_limit: int,
    compiled_binary=None,
) -> dict:
    """Run single test case inside isolate. Returns result dict."""
    
    box_pool = BoxIdPool(get_redis_client())
    box_id = box_pool.acquire()
    
    try:
        with IsolateBox(box_id=box_id) as box:
            
            # Copy source/binary
            box.copy_file(submission.source_code, config['file'])
            if compiled_binary:
                # Copy compiled binary into new box
                import shutil
                binary_src = os.path.join(compiled_binary, 'solution')
                binary_dst = os.path.join(box.box_dir, 'solution')
                shutil.copy2(binary_src, binary_dst)
                os.chmod(binary_dst, 0o755)
            
            # Run
            result = box.run(
                cmd=config['run'],
                stdin=test_case.input_data,
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
            
            # Map isolate status to our status
            status = _map_isolate_status(
                isolate_result=result,
                expected_output=test_case.expected_output,
                time_limit=time_limit,
                memory_limit=memory_limit,
            )
            
            return {
                'test_case_id':  test_case.id,
                'status':        status,
                'time':          result['time'],
                'wall_time':     result['wall_time'],
                'memory':        result['memory'],
                'exit_code':     result['exit_code'],
                'exit_signal':   result.get('exit_signal'),
                'stdout':        result['stdout'][:1024],  # Truncate for storage
                'stderr':        result['stderr'][:512],
            }
    finally:
        box_pool.release(box_id)


def _map_isolate_status(
    isolate_result: dict,
    expected_output: str,
    time_limit: float,
    memory_limit: int,
) -> str:
    """
    Map isolate execution result to our judge status.
    
    Isolate 'status' field values:
        RE  — Runtime Error (non-zero exit / signal)
        TO  — Time limit exceeded (cpu or wall)
        SG  — Killed by signal
        XX  — Internal error
        (empty) — OK
    """
    status = isolate_result.get('status', '')
    
    if status == 'TO':
        return 'time_limit_exceeded'
    
    if isolate_result['memory'] > memory_limit:
        return 'memory_limit_exceeded'
    
    if status in ('RE', 'SG'):
        return 'runtime_error'
    
    if status == 'XX':
        return 'system_error'
    
    if isolate_result['exit_code'] != 0:
        return 'runtime_error'
    
    # Compare output
    if _outputs_match(isolate_result['stdout'], expected_output):
        return 'accepted'
    
    return 'wrong_answer'


def _outputs_match(actual: str, expected: str) -> bool:
    """
    IOI-style output comparison:
    - Trim trailing whitespace per line
    - Ignore trailing newlines
    - Case-sensitive
    """
    def normalize(s: str) -> list:
        lines = s.rstrip('\n').split('\n')
        return [line.rstrip() for line in lines]
    
    return normalize(actual) == normalize(expected)
```

---

## TASK 3 — MODELS UPDATE (models.py)

```python
# apps/submissions/models.py — Language enum

class Language(models.TextChoices):
    PYTHON     = 'python',     'Python 3.13'
    CPP        = 'cpp',        'GNU C++ 17'
    JAVA       = 'java',       'Java 17'
    JAVASCRIPT = 'javascript', 'Node.js 20'
    PASCAL     = 'pascal',     'Free Pascal 3.2'
    CSHARP     = 'csharp',     'C# (.NET 8)'
    GOLANG     = 'golang',     'Go 1.22'
    PYPY       = 'pypy',       'PyPy 3.11'
    MSVC_CPP   = 'msvc_cpp',  'C++ (MSVC-compatible)'

class Submission(models.Model):
    # Existing fields stay the same
    # Add these new fields:
    
    test_results  = models.JSONField(default=list, blank=True)
    # Format: [{'test_case_id': 1, 'status': 'accepted', 'time': 0.123, ...}]
    
    compile_output = models.TextField(blank=True, default='')
    finished_at    = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'problem', '-created_at']),
            models.Index(fields=['contest', 'status']),
            models.Index(fields=['-created_at']),
        ]
```

---

## TASK 4 — SECURITY HARDENING

### 4.1 Seccomp filter (block dangerous syscalls)

```python
# In IsolateBox.run(), add seccomp profile:
# Create /etc/isolate-seccomp.json with blocked syscalls:

BLOCKED_SYSCALLS = [
    'socket', 'connect', 'bind', 'listen', 'accept',
    'sendto', 'recvfrom', 'sendmsg', 'recvmsg',
    'ptrace', 'process_vm_readv', 'process_vm_writev',
    'perf_event_open', 'kexec_load', 'init_module',
]

# Add to isolate run command:
# --cg-mem  (use cgroups for memory — more accurate)
# Note: isolate already uses seccomp internally
```

### 4.2 Docker run flags (docker-compose.yml)

```yaml
# docker-compose.yml — judge service
judge:
  build: ./docker/judge
  privileged: true          # REQUIRED for isolate (cgroups)
  # OR more restrictive:
  cap_add:
    - SYS_ADMIN             # For cgroups
    - NET_ADMIN             # For network namespace
  security_opt:
    - seccomp:unconfined    # Isolate handles its own seccomp
  volumes:
    - /sys/fs/cgroup:/sys/fs/cgroup:rw  # cgroups v2
  environment:
    - CELERY_CONCURRENCY=8  # 8 parallel judgings per worker
```

---

## TASK 5 — PERFORMANCE: BATCH EXECUTION (IOI style)

```python
# For IOI-style contests: run ALL test cases, calculate score
# For ICPC-style: stop at first wrong answer

from celery import chord

@shared_task
def judge_ioi_style(submission_id: int):
    """
    IOI-style: Run ALL test cases, calculate partial score.
    Used for olympiad problems with subtasks.
    """
    submission = Submission.objects.get(id=submission_id)
    test_cases = TestCase.objects.filter(problem=submission.problem).order_by('order')
    
    # Launch all test cases in parallel
    tasks = [
        run_test_case_task.s(submission_id, tc.id)
        for tc in test_cases
    ]
    
    # chord: run all, then aggregate
    chord(tasks)(aggregate_results.s(submission_id))


@shared_task
def run_test_case_task(submission_id: int, test_case_id: int) -> dict:
    """Single test case runner — parallelizable."""
    # ... (uses IsolateBox as above)


@shared_task
def aggregate_results(results: list, submission_id: int):
    """Aggregate all test case results, compute final verdict."""
    submission = Submission.objects.get(id=submission_id)
    
    # IOI scoring: sum of subtask scores
    total_score = 0
    subtask_results = {}
    
    for result in results:
        tc = TestCase.objects.get(id=result['test_case_id'])
        subtask = tc.subtask_id
        
        if subtask not in subtask_results:
            subtask_results[subtask] = {'all_ac': True, 'score': tc.subtask_score}
        
        if result['status'] != 'accepted':
            subtask_results[subtask]['all_ac'] = False
    
    for subtask_id, data in subtask_results.items():
        if data['all_ac']:
            total_score += data['score']
    
    # Final verdict
    all_accepted = all(r['status'] == 'accepted' for r in results)
    worst = max(results, key=lambda r: STATUS_PRIORITY_MAP.get(r['status'], 0))
    
    submission.status = 'accepted' if all_accepted else worst['status']
    submission.total_score = total_score
    submission.test_results = results
    submission.save()
```

---

## TASK 6 — CHECKER SYSTEM (Xalqaro olimpiadalar standarti)

```python
class CheckerType(models.TextChoices):
    EXACT    = 'exact',   'Exact Match'       # Default
    TOKEN    = 'token',   'Token Match'        # Ignore extra spaces
    FLOAT    = 'float',   'Float Match'        # 1e-6 tolerance
    SPECIAL  = 'special', 'Special Judge'      # Custom checker program
    REACTIVE = 'reactive','Reactive'           # Interactive problems (future)

class Problem(models.Model):
    # Add:
    checker_type    = models.CharField(max_length=20, choices=CheckerType.choices, default='exact')
    checker_source  = models.TextField(blank=True)   # For special judge
    checker_binary  = models.BinaryField(null=True)  # Compiled checker


def run_checker(checker_type: str, actual: str, expected: str, input_data: str = '') -> tuple:
    """
    Returns: (is_accepted: bool, score: float, message: str)
    
    Implements Testlib-compatible checker interface.
    """
    if checker_type == 'exact':
        ok = _outputs_match(actual, expected)
        return ok, 1.0 if ok else 0.0, 'OK' if ok else 'Wrong Answer'
    
    elif checker_type == 'token':
        # Split by whitespace, compare tokens
        def tokenize(s): return s.split()
        ok = tokenize(actual) == tokenize(expected)
        return ok, 1.0 if ok else 0.0, 'OK' if ok else 'Wrong Answer'
    
    elif checker_type == 'float':
        # Compare floating point numbers with 1e-6 relative/absolute tolerance
        try:
            actual_nums   = [float(x) for x in actual.split()]
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
        # Run checker program inside isolate
        # Checker receives: input, expected, actual
        # Returns 0 for AC, non-zero for WA
        # (Testlib compatible)
        return _run_special_checker(actual, expected, input_data)
    
    return False, 0.0, 'Unknown checker type'
```

---

## TASK 7 — MONITORING & OBSERVABILITY

```python
# Add to judge_engine.py — metrics for Prometheus/Grafana

import time
from dataclasses import dataclass

@dataclass  
class JudgeMetrics:
    submission_id:  int
    language:       str
    problem_id:     int
    compile_time_ms: float
    judge_time_ms:  float
    test_count:     int
    status:         str
    
    def log(self):
        logger.info(
            'judge_complete',
            extra={
                'submission_id':  self.submission_id,
                'language':       self.language,
                'status':         self.status,
                'judge_time_ms':  self.judge_time_ms,
                'test_count':     self.test_count,
            }
        )
        # Send to Prometheus pushgateway (optional)
        # metrics_client.histogram('judge_duration_ms', self.judge_time_ms, tags=...)
```

---

## QUALITY REQUIREMENTS (Non-negotiable)

```
✅ Type hints on ALL functions
✅ Docstrings on ALL public methods  
✅ Unit tests for _map_isolate_status() and _outputs_match()
✅ Error logging with submission_id in every log line
✅ Graceful degradation: if isolate fails → return system_error (never crash)
✅ Box ID always released in finally block (no leaks)
✅ Output truncated to 4MB max (prevent OOM from print-spamming)
✅ All timeouts have outer safety timeout (+5s)
✅ No hardcoded paths — use constants at top of file
✅ Migration file for new Language enum values
```

---

## WORLD-CLASS REFERENCE IMPLEMENTATIONS

Study these before writing code:

```
1. IOI 2023 judge:     https://github.com/ioi/isolate
2. Codeforces (leaked): polygon.codeforces.com architecture docs
3. AtCoder judge:       https://github.com/atcoder/ac-library
4. DMOJ (Canadian OJ): https://github.com/DMOJ/judge-server
5. Domjudge (ICPC):    https://github.com/DOMjudge/domjudge
6. Kattis format:       https://open.kattis.com/problem-package-format
7. Testlib (checker):   https://github.com/MikeMirzayanov/testlib
```

---

## DELIVERABLES (what to produce)

1. `docker/judge/Dockerfile` — complete, production-ready
2. `backend/apps/submissions/judge_engine.py` — complete rewrite with isolate
3. `backend/apps/submissions/models.py` — Language enum + new fields
4. `backend/apps/submissions/migrations/XXXX_language_update.py` — auto-generated
5. `backend/apps/submissions/tests/test_judge_engine.py` — unit tests
6. `docker-compose.yml` — updated judge service with cgroup mounts

**Each file must be complete and production-ready. No placeholders, no TODOs.**
```

---

*End of Master Prompt — Version 1.0*
*Target: IOI/ICPC/Codeforces grade online judge*
*Stack: Django + Celery + Isolate + Docker*

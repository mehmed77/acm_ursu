"""Test all languages inside Docker judge container."""
import os, sys, shutil, django
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.submissions.judge_engine import IsolateBox, LANGUAGE_CONFIG, _clean_input

def test_lang(language, code, stdin_data, expected_output):
    config = LANGUAGE_CONFIG[language]
    print(f"\n{'='*60}")
    print(f"Testing: {language}")
    print(f"{'='*60}")

    box_id = 50
    tmp_compiled = f'/tmp/compiled_{language}'

    # === COMPILE ===
    if config['compile']:
        print(f"  [1/2] Compiling...")
        with IsolateBox(box_id=box_id) as box:
            box.copy_file(code, config['file'])
            result = box.run(
                cmd=config['compile'], stdin='',
                time_limit=30.0, wall_time_limit=60.0,
                memory_limit=0, max_processes=256,
                extra_dirs=config.get('extra_dirs', ['/usr', '/lib', '/lib64']),
                env_vars={'PATH': '/usr/local/bin:/usr/bin:/bin', 'HOME': '/tmp', **config.get('env', {})},
            )
            if result['exit_code'] != 0:
                print(f"  COMPILE ERROR (exit {result['exit_code']}):")
                print(f"  stderr: {result['stderr'][:500]}")
                print(f"  stdout: {result['stdout'][:500]}")
                return False
            print(f"  Compilation OK ({result['time']:.3f}s)")
            # Copy compiled files before sandbox cleanup
            if os.path.exists(tmp_compiled):
                shutil.rmtree(tmp_compiled)
            shutil.copytree(box.box_dir, tmp_compiled)
    else:
        tmp_compiled = None

    # === RUN ===
    print(f"  [2/2] Running...")
    with IsolateBox(box_id=box_id + 1) as box:
        box.copy_file(code, config['file'])
        if tmp_compiled:
            for f in os.listdir(tmp_compiled):
                if f.endswith('.class') or f == 'solution' or f == 'Solution.exe':
                    box.copy_binary(os.path.join(tmp_compiled, f), f)

        result = box.run(
            cmd=config['run'], stdin=_clean_input(stdin_data),
            time_limit=5.0, wall_time_limit=15.0,
            memory_limit=config.get('memory_limit_kb', 262144),
            max_processes=config.get('max_processes', 64),
            extra_dirs=config.get('extra_dirs', ['/usr', '/lib', '/lib64']),
            env_vars={'PATH': '/usr/local/bin:/usr/bin:/bin', 'HOME': '/tmp', **config.get('env', {})},
        )

        actual = result['stdout'].strip()
        expected = expected_output.strip()
        if result['exit_code'] != 0 or result.get('status') in ('RE', 'SG', 'TO'):
            print(f"  RUNTIME ERROR (exit {result['exit_code']}, status={result.get('status','')}):")
            print(f"  stderr: {result['stderr'][:500]}")
            print(f"  stdout: {result['stdout'][:500]}")
            return False
        if actual == expected:
            print(f"  ACCEPTED | Output: '{actual}' | Time: {result['time']:.3f}s | Mem: {result['memory']}KB")
            return True
        else:
            print(f"  WRONG ANSWER | Expected: '{expected}' | Got: '{actual}'")
            return False

results = {}

# Python
results['python'] = test_lang('python', 'a, b = map(int, input().split())\nprint(a + b)', '5 6', '11')

# C++
results['cpp'] = test_lang('cpp',
    '#include <iostream>\nusing namespace std;\nint main() { int a, b; cin >> a >> b; cout << a + b; return 0; }',
    '5 6', '11')

# Java
results['java'] = test_lang('java',
    'import java.util.*;\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n        System.out.print(a+b);\n    }\n}',
    '5 6', '11')

print(f"\n{'='*60}")
print("RESULTS SUMMARY:")
for lang, ok in results.items():
    print(f"  {lang}: {'ACCEPTED' if ok else 'FAILED'}")
print(f"{'='*60}")

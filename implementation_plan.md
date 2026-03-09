# 12 Compiler/Interpreter Integration for Online Judge

Add support for 12 languages: **MinGW GNU C++ 15.2.0, Python 3.13.8, PyPy3.11 v7.3.20, PascalABC.NET 3.11.0, Java SE JDK 16.0.1, Free Pascal 3.2.2, Borland Delphi 7.0, Microsoft Visual C++ 2017, Microsoft Visual C# 2017, Microsoft Visual Basic 2017, Go 1.20.14, Node.js 19.0.0**

> [!IMPORTANT]
> Some of these compilers (Borland Delphi 7.0, PascalABC.NET 3.11.0, MSVC++ 2017, MSVB 2017) are **Windows-only** tools. Since the Docker sandbox runs **Ubuntu Linux**, we have two realistic approaches:
> 1. **Windows-native compilers** — Install via Wine in Docker (complex, fragile, large image ~2GB+)
> 2. **Linux-equivalent substitutes** — Use Free Pascal (for Delphi), Mono (for C#, VB.NET), and GCC (already present for C++)
>
> **Recommendation**: Use Linux equivalents. This is the standard approach for online judges (Codeforces, AtCoder, etc.).

> [!WARNING]
> **Borland Delphi 7.0** is a 32-bit Windows-only IDE from 2002 with no Linux equivalent. Free Pascal already provides full Delphi compatibility mode (`-Mdelphi`). We will use **Free Pascal in Delphi mode** as the substitute.
>
> **PascalABC.NET** requires .NET runtime. We will use **Mono** to compile and run PascalABC.NET programs. The actual PascalABC.NET compiler (`pabcnetcclear.exe`) can run under Mono.

## Final Language Map

| User-Facing Label | Internal Key | Compiler/Runtime | Docker Package |
|---|---|---|---|
| GNU C++ 15.2 | `gcc_cpp` | `g++ -std=c++17 -O2` | `g++` (already installed) |
| Python 3 | `python` | `python3` | `python3` (already installed) |
| PyPy 3 | `pypy` | `pypy3` | `pypy3` from PPA |
| Java 16 | [java](file:///f:/UrDU/online-judge/backend/apps/submissions/judge_engine.py#50-54) | `javac / java` | `openjdk-17-jdk-headless` (already installed) |
| Free Pascal 3.2 | `pascal` | `fpc` | `fpc` |
| Delphi (FPC) | `delphi` | `fpc -Mdelphi` | `fpc` (same) |
| PascalABC.NET | `pascalabc` | `mono + pabcnetcclear.exe` | `mono-devel` + download PascalABC compiler |
| MS Visual C++ 2017 | `msvc_cpp` | `g++ -std=c++17 -O2` (GCC substitute) | `g++` (already installed) |
| C# (Mono) | `csharp` | `mcs` + `mono` | `mono-devel` |
| VB.NET (Mono) | `vbnet` | `vbnc` + `mono` | `mono-vbnc` |
| Go 1.20 | `golang` | `go build` | `golang-go` |
| Node.js 19 | `javascript` | `node` | `nodejs` (already installed) |

---

## Proposed Changes

### Docker Image

#### [MODIFY] [Dockerfile](file:///f:/UrDU/online-judge/docker/judge/Dockerfile)

Install additional compilers:
- `fpc` — Free Pascal (covers Pascal + Delphi mode)
- `pypy3` — PyPy 3.x 
- `mono-devel`, `mono-vbnc` — C#, VB.NET
- `golang-go` — Go 1.20+
- Download PascalABC.NET compiler (pabcnetcclear.exe) for use with Mono

---

### Backend — Submission Model

#### [MODIFY] [models.py](file:///f:/UrDU/online-judge/backend/apps/submissions/models.py)

Expand [Language(TextChoices)](file:///f:/UrDU/online-judge/backend/apps/submissions/models.py#8-13) enum with 8 new entries:
```python
class Language(models.TextChoices):
    PYTHON = 'python', 'Python 3'
    CPP = 'cpp', 'GNU C++ 17'
    PYPY = 'pypy', 'PyPy 3'
    JAVA = 'java', 'Java 16'
    PASCAL = 'pascal', 'Free Pascal'
    DELPHI = 'delphi', 'Delphi (FPC)'
    PASCALABC = 'pascalabc', 'PascalABC.NET'
    MSVC_CPP = 'msvc_cpp', 'MS Visual C++'
    CSHARP = 'csharp', 'C# (Mono)'
    VBNET = 'vbnet', 'VB.NET'
    GOLANG = 'golang', 'Go'
    JAVASCRIPT = 'javascript', 'Node.js'
```

Change `max_length=20` → `max_length=20` (fine, longest is `pascalabc` = 9 chars, but `javascript` is 10 — already works).

#### [NEW] Migration file

Run `python manage.py makemigrations submissions` to generate migration.

---

### Backend — Judge Engine

#### [MODIFY] [judge_engine.py](file:///f:/UrDU/online-judge/backend/apps/submissions/judge_engine.py)

**LIMITS** — Add entries for pypy, pascal, delphi, pascalabc, msvc_cpp, csharp, vbnet, golang.

**COMPILE_COMMANDS** — Add:
- `pascal`: `fpc -O2 -o/sandbox/program /sandbox/code.pas 2>&1`
- `delphi`: `fpc -Mdelphi -O2 -o/sandbox/program /sandbox/code.dpr 2>&1`
- `pascalabc`: `mono /opt/pabcnet/pabcnetcclear.exe /sandbox/code.pas 2>&1`
- `msvc_cpp`: same as cpp (`g++ -O2 -std=c++17 ...`)
- `csharp`: `mcs -out:/sandbox/program.exe /sandbox/code.cs 2>&1`
- `vbnet`: `vbnc -out:/sandbox/program.exe /sandbox/code.vb 2>&1`
- `golang`: `cd /sandbox && go build -o program code.go 2>&1`

**RUN_COMMANDS** — Add:
- `pypy`: `pypy3 /sandbox/code.py`
- `pascal`: `/sandbox/program`
- `delphi`: `/sandbox/program`
- `pascalabc`: `mono /sandbox/code.exe`
- `msvc_cpp`: `/sandbox/program`
- `csharp`: `mono /sandbox/program.exe`
- `vbnet`: `mono /sandbox/program.exe`
- `golang`: `/sandbox/program`

**FILE_NAMES** — Add:
- `pypy`: `code.py`
- `pascal`: `code.pas`
- `delphi`: `code.dpr`
- `pascalabc`: `code.pas`
- `msvc_cpp`: `code.cpp`
- `csharp`: `code.cs`
- `vbnet`: `code.vb`
- `golang`: `code.go`

**BANNED_PATTERNS** — Add security rules for each new language.

**[_prepare_code](file:///f:/UrDU/online-judge/backend/apps/submissions/judge_engine.py#258-301)** — Add PyPy wrapper (same as Python), Go/Pascal/Delphi/C# (no wrapper, use `/usr/bin/time` like C++).

**[_run_single_test](file:///f:/UrDU/online-judge/backend/apps/submissions/judge_engine.py#303-414)** — Add compiled-language categories (pascal, delphi, pascalabc, msvc_cpp, csharp, vbnet, golang) to the `if language in ('cpp', 'java')` block to use `/usr/bin/time`.

**[_compile](file:///f:/UrDU/online-judge/backend/apps/submissions/judge_engine.py#232-243)** — Extend to support new compiled languages.

---

### Frontend — ProblemDetail.jsx

#### [MODIFY] [ProblemDetail.jsx](file:///f:/UrDU/online-judge/frontend/src/pages/ProblemDetail.jsx)

Update `starterCode` object with starter code for all 12 languages.

Update `LANGUAGES` array with all 12 language entries (value, label, short, color, bg, icon).

---

### Frontend — ContestDetail.jsx

#### [MODIFY] [ContestDetail.jsx](file:///f:/UrDU/online-judge/frontend/src/pages/ContestDetail.jsx)

Update `STARTERS` with starter code for all new languages.

Update `LANGS` array with all 12 entries.

---

### Frontend — Status.jsx

#### [MODIFY] [Status.jsx](file:///f:/UrDU/online-judge/frontend/src/pages/Status.jsx)

Update `LANG` object with all 12 language entries.

Update filter [FSel](file:///f:/UrDU/online-judge/frontend/src/pages/Status.jsx#366-389) options (around line 694-700) with all 12 languages.

---

### Frontend — SubmissionCodeModal.jsx

#### [MODIFY] [SubmissionCodeModal.jsx](file:///f:/UrDU/online-judge/frontend/src/components/submissions/SubmissionCodeModal.jsx)

Update `LANG_MAP` and `LANG_LABEL` with all 12 language entries.

---

## Verification Plan

### Manual Verification (User-Assisted)

1. **Build Docker image**: 
   ```bash
   cd f:\UrDU\online-judge
   docker-compose build judge
   ```
   Verify all compilers are installed by running inside the container:
   ```bash
   docker run --rm online-judge-judge bash -c "g++ --version && python3 --version && pypy3 --version && javac -version && fpc -h | head -1 && mcs --version && vbnc /help | head -1 && go version && node --version"
   ```

2. **Run Django migration**:
   ```bash
   cd f:\UrDU\online-judge\backend
   python manage.py makemigrations submissions
   python manage.py migrate
   ```

3. **Frontend check**: Start the dev server, open ProblemDetail page → verify you see all 12 languages in the dropdown.

4. **Submit test**: Write a simple "Hello World" program in each new language and verify judge processes it correctly.

> [!NOTE]
> Since all test verification requires Docker and the full backend/frontend running, this will need your manual testing. There are no existing automated unit tests for the judge engine.

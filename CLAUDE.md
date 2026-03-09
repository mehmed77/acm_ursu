# Online Judge — CLAUDE.md

## Loyiha haqida
ACM/ICPC uslubidagi Online Judge platformasi. Foydalanuvchilar algoritmik masalalarni yechadi,
kod Judge0 API orqali baholanadi. acmp.ru saytiga o'xshash funksionallik.

## Tech Stack
- **Backend:** Django 5.x + Django REST Framework
- **Database:** PostgreSQL
- **Frontend:** React 18 + Vite
- **Judge:** Judge0 API (rapidapi.com orqali yoki o'z serverda)
- **Task Queue:** Celery + Redis (asinxron submission uchun)
- **Auth:** JWT (djangorestframework-simplejwt)

## Loyiha strukturasi
```
online-judge/
├── backend/
│   ├── config/              # Django settings, urls, wsgi
│   ├── apps/
│   │   ├── accounts/        # User, Profile, Rating
│   │   ├── problems/        # Problem, TestCase, Tag
│   │   ├── submissions/     # Submission, Judge0 integratsiya
│   │   ├── contests/        # Contest, ContestProblem, ContestParticipant
│   │   └── leaderboard/     # Reyting hisoblash
│   ├── requirements.txt
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── pages/           # Home, Problems, Contest, Leaderboard, Profile
│   │   ├── components/      # Navbar, CodeEditor, ProblemCard, Submission
│   │   ├── api/             # axios instance + API calls
│   │   └── store/           # Redux yoki Zustand (auth state)
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml
└── CLAUDE.md
```

## Asosiy Modellar

### accounts app
- `User` — Django AbstractUser (username, email, rating, solved_count)
- `UserProfile` — bio, country, avatar

### problems app
- `Problem` — title, description, input_format, output_format, difficulty (Easy/Medium/Hard), time_limit, memory_limit, is_published
- `TestCase` — problem (FK), input, expected_output, is_sample
- `Tag` — name (dp, graph, greedy, ...)

### submissions app
- `Submission` — user (FK), problem (FK), language, code, status, time_used, memory_used, judge0_token, created_at
- Status choices: PENDING, RUNNING, ACCEPTED, WRONG_ANSWER, TIME_LIMIT_EXCEEDED, RUNTIME_ERROR, COMPILATION_ERROR

### contests app
- `Contest` — title, description, start_time, end_time, is_rated
- `ContestProblem` — contest (FK), problem (FK), order, points
- `ContestParticipant` — contest (FK), user (FK), score, penalty

## Judge0 Integratsiya

### Qo'llab-quvvatlanadigan tillar (Judge0 language_id)
- Python 3: 71
- C++17: 54
- Java: 62
- JavaScript (Node.js): 63

### Submission flow
1. Foydalanuvchi kodni yuboradi → `POST /api/submissions/`
2. Django Celery task yaratadi
3. Celery → Judge0 API ga POST so'rov yuboradi (barcha test caselar uchun)
4. Judge0 token saqlaydi, natijani polling qiladi
5. Barcha testlar o'tsa → ACCEPTED, aks holda mos status
6. Frontend WebSocket yoki polling orqali natijani ko'rsatadi

### Judge0 API so'rovlari
```python
# Submission yuborish
POST https://judge0-ce.p.rapidapi.com/submissions
{
  "source_code": "<base64 encoded>",
  "language_id": 71,
  "stdin": "<base64 encoded input>",
  "expected_output": "<base64 encoded>",
  "cpu_time_limit": 2.0,
  "memory_limit": 256000
}

# Natijani olish
GET https://judge0-ce.p.rapidapi.com/submissions/{token}
```

## API Endpointlar (DRF)

```
# Auth
POST   /api/auth/register/
POST   /api/auth/login/
POST   /api/auth/token/refresh/

# Problems
GET    /api/problems/              # ro'yxat (filter: difficulty, tag, status)
GET    /api/problems/{slug}/       # batafsil + sample test cases
GET    /api/problems/{slug}/submissions/  # foydalanuvchi submission lari

# Submissions
POST   /api/submissions/           # yangi submission
GET    /api/submissions/{id}/      # natija

# Contests
GET    /api/contests/
GET    /api/contests/{id}/
POST   /api/contests/{id}/register/
GET    /api/contests/{id}/leaderboard/

# Leaderboard
GET    /api/leaderboard/           # global reyting
GET    /api/users/{username}/      # profil
```

## Frontend Sahifalar

- `/` — Bosh sahifa (statistika, oxirgi submissions)
- `/problems` — Masalalar ro'yxati (filter, search)
- `/problems/:slug` — Masala + Code Editor (Monaco Editor)
- `/contests` — Kontestlar ro'yxati
- `/contests/:id` — Kontest sahifasi
- `/leaderboard` — Global reyting
- `/profile/:username` — Foydalanuvchi profili
- `/admin` — Django Admin (masala, test case qo'shish)

## Muhim qarorlar
- Code Editor: **Monaco Editor** (VS Code engine) ishlatamiz
- Styling: **Tailwind CSS**
- State: **Zustand** (lightweight, Redux dan sodda)
- Real-time: Submission natijasi uchun **polling** (har 2 soniyada)
- Problem description: **Markdown** formatida saqlanadi, frontendda render qilinadi

## Bosqichlar (Development Order)
1. Django loyiha setup + PostgreSQL ulash
2. `accounts` app — User model, JWT auth
3. `problems` app — Problem, TestCase modellari + Admin
4. `submissions` app — Judge0 integratsiya + Celery
5. `contests` app
6. `leaderboard` app
7. React frontend — sahifalar ketma-ket
8. Docker compose — hammasi birga

## Environment Variables (.env)
```
# Backend
SECRET_KEY=
DEBUG=True
DATABASE_URL=postgresql://user:pass@localhost:5432/onlinejudge
REDIS_URL=redis://localhost:6379
JUDGE0_API_KEY=         # RapidAPI key
JUDGE0_BASE_URL=https://judge0-ce.p.rapidapi.com

# Frontend
VITE_API_BASE_URL=http://localhost:8000
```
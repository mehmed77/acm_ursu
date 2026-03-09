# Online Judge — Backend

ACM/ICPC uslubidagi Online Judge platformasi. Django 5 + DRF + PostgreSQL + JWT + Celery.

## Tezkor boshlash

### 1. Virtual environment

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 2. PostgreSQL baza yaratish

```sql
CREATE DATABASE onlinejudge;
```

### 3. Environment sozlash

```bash
cp .env.example .env
# .env ni o'zingizning sozlamalaringiz bilan to'ldiring
```

### 4. Migration va superuser

```bash
python manage.py migrate
python manage.py createsuperuser
```

### 5. Server ishga tushirish

```bash
# Django dev server
python manage.py runserver

# Celery worker (alohida terminal)
celery -A config worker -l info

# Redis kerak (Celery uchun)
# Docker: docker run -d -p 6379:6379 redis:alpine
```

## API Endpointlar

| Endpoint | Method | Auth | Tavsif |
|----------|--------|------|--------|
| `/api/auth/register/` | POST | ❌ | Ro'yxatdan o'tish |
| `/api/auth/login/` | POST | ❌ | JWT token |
| `/api/auth/token/refresh/` | POST | ❌ | Token yangilash |
| `/api/auth/profile/` | GET/PUT | ✅ | Profil |
| `/api/problems/` | GET | ❌ | Masalalar |
| `/api/problems/{slug}/` | GET | ❌ | Masala batafsil |
| `/api/problems/{slug}/submissions/` | GET | ✅ | User submissions |
| `/api/submissions/` | POST | ✅ | Yangi submission |
| `/api/submissions/{id}/` | GET | ❌ | Natija |
| `/api/contests/` | GET | ❌ | Kontestlar |
| `/api/contests/{slug}/` | GET | ❌ | Kontest batafsil |
| `/api/contests/{slug}/register/` | POST | ✅ | Ro'yxatdan o'tish |
| `/api/contests/{slug}/leaderboard/` | GET | ❌ | Standings |
| `/api/contests/{slug}/my-submissions/` | GET | ✅ | User submissions |
| `/api/leaderboard/` | GET | ❌ | Global reyting |
| `/api/users/{username}/` | GET | ❌ | Public profil |

## Tech Stack

- **Django 5.x** + Django REST Framework
- **PostgreSQL** — database
- **JWT** — djangorestframework-simplejwt
- **Celery + Redis** — asinxron submission
- **Judge0 API** — kod baholash

## Loyiha strukturasi

```
backend/
├── config/          # settings, urls, celery, wsgi/asgi
├── apps/
│   ├── accounts/    # User, Profile, JWT auth
│   ├── problems/    # Problem, TestCase, Tag
│   ├── submissions/ # Submission, Judge0, Celery task
│   ├── contests/    # Contest, ACM ICPC scoring
│   └── leaderboard/ # Rating, ranks, public profiles
├── requirements.txt
├── manage.py
└── .env.example
```

# Online Judge — Ishga Tushirish

## Dastlabki sozlash (bir marta)

### 1. Docker Judge Image Build
```bash
docker build -t online-judge-judge ./docker/judge
```

### 2. Docker servislari (PostgreSQL, Redis, Judge)
```bash
docker-compose up -d db redis
```

### 3. Backend sozlash
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
```

### 4. Frontend sozlash
```bash
cd frontend
npm install
```

---

## Har kunlik ishga tushirish

### Terminal 0 — Docker (DB + Redis)
```bash
docker-compose up -d db redis
```

### Terminal 1 — Django Backend
```bash
cd backend
.\venv\Scripts\python.exe manage.py runserver
```

### Terminal 2 — Celery Worker
```bash
cd backend
.\venv\Scripts\python.exe -m celery -A config worker --loglevel=info --pool=solo
```

### Terminal 3 — Frontend
```bash
cd frontend
npm run dev
```

---

## URL lar
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/
- Admin: http://localhost:8000/admin/

---

## Judge tizimi tekshiruvi

```bash
cd backend
.\venv\Scripts\python.exe manage.py shell
```

```python
from apps.submissions.judge_engine import check_code_safety, run_in_sandbox

# 1. Xavfsizlik — bloklangan kod
safe, reason = check_code_safety("import os\nos.system('ls')", "python")
print(f"Bloklandi: {not safe}")  # True

# 2. To'g'ri kod
result = run_in_sandbox(
    code="n=int(input())\nprint(n*2)",
    language="python",
    stdin_data="5",
    time_limit=2.0,
    memory_limit=128,
)
print(f"Output: {result['stdout'].strip()}")  # 10

# 3. Infinite loop — TLE
result = run_in_sandbox(
    code="while True: pass",
    language="python",
    stdin_data="",
    time_limit=1.0,
    memory_limit=128,
)
print(f"Error: {result['error']}")  # TIME_LIMIT_EXCEEDED
```

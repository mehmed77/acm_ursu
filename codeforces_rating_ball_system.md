# Codeforces Reyting + Ball Tizimi — To'liq Yangilanish

## Maqsad
Rasmiy MikeMirzayanov blog va haqiqiy Codeforces
implementatsiyasiga asoslanib reyting tizimini
mukammallashtirish va masalalarga ball tizimi qo'shish.

---

## 1. REYTING ENGINE — 3 ta Tuzatish

### `apps/contests/rating_engine.py`

---

### TUZATISH 1: Birinchi Contest Qoidasi

Rasmiy qoida: yangi ishtirokchi uchun
`seed = 1 + n/2` (n = jami ishtirokchilar)

`calculate_rating_changes()` ichida:

```python
# ── 2. Kutilgan o'rinlar ──────────────────────

# RASMIY QOIDA: birinchi contest uchun seed = 1 + n/2
# Bu yangi foydalanuvchini o'rtadan boshlaydi (adolatli)

n = len(participants)

expected_ranks = []
for i in range(n):
    p = participants[i]

    # Birinchi contest: rating=0 yoki is_first_contest=True
    if p['old_rating'] == 0 or p.get('is_first_contest', False):
        # Rasmiy Codeforces qoidasi
        expected = 1.0 + n / 2.0
    else:
        expected = _get_expected_rank(ratings, i)

    expected_ranks.append(expected)
```

participants ro'yxatiga `is_first_contest` field qo'shing:

```python
# scoring.py da participants tayyorlashda:
participants = [{
    'user_id':          entry.user.id,
    'username':         entry.user.username,
    'old_rating':       getattr(entry.user, 'rating', 0) or 0,
    'rank':             entry.rank or 1,
    'solved':           entry.solved_count or 0,
    'penalty':          entry.penalty or 0,
    # YANGI: birinchi contest tekshiruvi
    'is_first_contest': (
        not RatingChange.objects.filter(
            user=entry.user
        ).exists()
    ),
} for entry in entries]
```

---

### TUZATISH 2: Aniq Zero-Sum Korreksiya

Rasmiy qoida: reyting yig'indisi o'zgarmasligi kerak.

```python
# ── 5. Muvozanat korreksiyasi (aniq zero-sum) ──────

# HOZIRGI (taxminiy):
total = sum(deltas)
inc   = min(max(-max(deltas), -(total // n)), 0)
deltas = [d + inc for d in deltas]

# TO'G'RI (rasmiy qoidaga muvofiq):
# Yig'indi 0 ga yaqinlashtiriladi,
# lekin hech kim haddan ko'p olmaydi
total = sum(deltas)
if total != 0:
    # Har bir delta ga tuzatish
    # (manfiy tomonga — reyting saqlanadi)
    correction = -(total // n)
    # Faqat pasaytirish yo'nalishida
    correction = min(correction, 0)
    deltas = [d + correction for d in deltas]

    # Qolgan farqni eng katta olganlardan ajratish
    remainder = sum(deltas)
    if remainder > 0:
        # Eng ko'p olganlardan birer-birer olib
        # yig'indini nolga yaqinlashtirish
        sorted_idx = sorted(
            range(n), key=lambda x: -deltas[x]
        )
        for idx in sorted_idx:
            if remainder <= 0:
                break
            deltas[idx] -= 1
            remainder   -= 1
```

---

### TUZATISH 3: Participants Tartib Himoyasi

```python
def calculate_rating_changes(participants: list) -> list:
    # YANGI: kiruvchi ma'lumotni tartiblash
    # (scoring.py noto'g'ri tartibda yuborsa himoya)
    participants = sorted(
        participants,
        key=lambda p: (p['rank'], p.get('penalty', 0))
    )
    # ... qolgan kod ...
```

---

## 2. BALL TIZIMI — Yangi

### `apps/problems/models.py` — Problem modeliga:

```python
class Problem(models.Model):
    # ... mavjud fieldlar ...

    # YANGI: Ball tizimi
    max_score = models.IntegerField(
        default  = 0,
        help_text = (
            '0 = ball tizimi yo\'q (ICPC uslubi). '
            '>0 = Codeforces uslubi (500, 1000, 1500...)'
        )
    )
    score_decay_rate = models.FloatField(
        default  = 0.5,
        help_text = (
            'Har daqiqada kamayish koeffitsienti. '
            'max_score * (1 - decay * vaqt)'
        )
    )
    wrong_penalty = models.IntegerField(
        default  = 50,
        help_text = 'Har noto\'g\'ri urinish uchun jarima (ball)'
    )

    def calculate_score(
        self,
        minutes_elapsed: int,
        wrong_attempts:  int = 0
    ) -> int:
        """
        Codeforces uslubida ball hisoblash.

        Args:
            minutes_elapsed: yechishga ketgan vaqt (daqiqa)
            wrong_attempts:  noto'g'ri urinishlar soni

        Returns:
            Hisoblangan ball (minimum 0)
        """
        if self.max_score == 0:
            # Ball tizimi yo'q — ICPC uslubi
            return 1 if wrong_attempts == 0 else 0

        # Codeforces formula:
        # ball = max(3*max/10, max - max/250*t - 50*wrong)
        min_score    = max(3 * self.max_score // 10, 0)
        time_penalty = (self.max_score // 250) * minutes_elapsed
        wrong_pen    = self.wrong_penalty * wrong_attempts

        score = self.max_score - time_penalty - wrong_pen
        return max(min_score, score)
```

---

### `apps/contests/models.py` — ContestProblem modeliga:

```python
class ContestProblem(models.Model):
    contest = models.ForeignKey(Contest, on_delete=models.CASCADE)
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE)
    order   = models.CharField(
        max_length=5,
        help_text='A, B, C, D...'
    )

    # YANGI: Contest darajasidagi ball sozlamasi
    # (problem.max_score ni override qiladi)
    max_score = models.IntegerField(
        null=True, blank=True,
        help_text=(
            'Agar bo\'sh bo\'lsa problem.max_score ishlatiladi. '
            'Codeforces: 500, 1000, 1500, 2000, 2500, 3000'
        )
    )

    def get_max_score(self) -> int:
        """Contest yoki problem darajasidagi max ball."""
        return self.max_score or self.problem.max_score or 0

    class Meta:
        ordering        = ['order']
        unique_together = ('contest', 'problem')
        unique_together = ('contest', 'order')
```

---

### `apps/contests/models.py` — ScoreboardEntry modeliga:

```python
class ScoreboardEntry(models.Model):
    # ... mavjud fieldlar ...

    # YANGI: Ball tizimi uchun
    total_score = models.IntegerField(
        default  = 0,
        help_text = 'Jami ball (Codeforces uslubi)'
    )

    # JSON: {problem_id: {'score': 450, 'attempts': 2, 'time': 35}}
    problem_scores = models.JSONField(
        default  = dict,
        help_text = 'Har bir masala uchun ball tafsilotlari'
    )
```

---

### `apps/contests/scoring.py` — Scoreboard hisoblash:

```python
def recalculate_scoreboard(contest) -> None:
    """
    ICPC va Codeforces ball tizimini qo'llab-quvvatlaydi.
    """
    from .models import ScoreboardEntry, ContestProblem
    from apps.submissions.models import Submission

    entries = list(
        ScoreboardEntry.objects.filter(
            contest    = contest,
            is_virtual = False,
        ).select_related('user')
    )

    contest_problems = list(
        ContestProblem.objects.filter(
            contest=contest
        ).select_related('problem')
    )

    # Contest ball tiziminimi?
    is_scored = any(
        cp.get_max_score() > 0
        for cp in contest_problems
    )

    for entry in entries:
        if is_scored:
            # ── CODEFORCES uslubi: ball ──────────────
            total     = 0
            prob_data = {}

            for cp in contest_problems:
                # Shu foydalanuvchining shu masaladagi
                # eng yaxshi accepted submission
                subs = Submission.objects.filter(
                    user    = entry.user,
                    problem = cp.problem,
                    contest = contest,
                    status  = 'AC',
                ).order_by('created_at')

                wrong_count = Submission.objects.filter(
                    user    = entry.user,
                    problem = cp.problem,
                    contest = contest,
                    status__in = ['WA', 'TLE', 'RE', 'MLE'],
                ).count()

                if subs.exists():
                    first_ac = subs.first()
                    # Daqiqalarda hisoblash
                    elapsed = int(
                        (first_ac.created_at - contest.start_time)
                        .total_seconds() / 60
                    )
                    score = cp.problem.calculate_score(
                        minutes_elapsed = elapsed,
                        wrong_attempts  = wrong_count,
                    )
                    total += score
                    prob_data[str(cp.problem.id)] = {
                        'score':    score,
                        'attempts': wrong_count + 1,
                        'time':     elapsed,
                        'accepted': True,
                    }
                elif wrong_count > 0:
                    prob_data[str(cp.problem.id)] = {
                        'score':    0,
                        'attempts': wrong_count,
                        'time':     None,
                        'accepted': False,
                    }

            entry.total_score   = total
            entry.problem_scores = prob_data

        else:
            # ── ICPC uslubi: solved + penalty ────────
            # Mavjud logika...
            pass

    # Tartiblash
    if is_scored:
        # Ko'proq ball → birinchi
        # Teng ballda: tezroq birinchi submission vaqti → birinchi
        sorted_entries = sorted(
            entries,
            key=lambda e: (
                -(e.total_score or 0),
                e.penalty or 0
            )
        )
    else:
        # Ko'proq solved → birinchi, teng solved → kam penalty
        sorted_entries = sorted(
            entries,
            key=lambda e: (
                -(e.solved_count or 0),
                e.penalty or 0
            )
        )

    # Rank berish (tie bilan)
    rank = 1
    to_update = []
    for i, entry in enumerate(sorted_entries):
        if i > 0:
            prev   = sorted_entries[i - 1]
            is_tie = (
                entry.total_score == prev.total_score
                and entry.penalty == prev.penalty
            ) if is_scored else (
                entry.solved_count == prev.solved_count
                and entry.penalty  == prev.penalty
            )
            if not is_tie:
                rank = i + 1
        entry.rank = rank
        to_update.append(entry)

    ScoreboardEntry.objects.bulk_update(
        to_update,
        ['rank', 'total_score', 'problem_scores']
    )
```

---

## 3. ADMIN PANEL — Ball Sozlamasi

### `src/admin/pages/AdminContestForm.jsx` —
### Masalalar bo'limiga qo'sh:

```jsx
// Har bir masala uchun ball sozlamasi
{contestProblems.map((cp, idx) => (
    <div key={cp.id} style={{
        display:      'grid',
        gridTemplateColumns: '40px 1fr 150px 150px 40px',
        gap:          '10px',
        alignItems:   'center',
        padding:      '10px 14px',
        background:   'rgba(255,255,255,0.02)',
        borderRadius: '8px',
        marginBottom: '6px',
    }}>
        {/* Tartib harfi */}
        <div style={{
            fontSize:   '14px',
            fontWeight: '700',
            color:      '#a5b4fc',
        }}>
            {cp.order}
        </div>

        {/* Masala nomi */}
        <div style={{ fontSize:'13px', color:'#e8e8f0' }}>
            {cp.problem.title}
        </div>

        {/* Max ball */}
        <div>
            <div style={{
                fontSize:     '10px',
                color:        '#3a3a5a',
                marginBottom: '4px',
            }}>
                MAX BALL
            </div>
            <select
                value={cp.max_score || 0}
                onChange={e => updateProblemScore(
                    cp.id, parseInt(e.target.value)
                )}
                style={{
                    width:        '100%',
                    height:       '32px',
                    background:   'rgba(255,255,255,0.04)',
                    border:       '1px solid rgba(255,255,255,0.09)',
                    borderRadius: '8px',
                    color:        '#e8e8f0',
                    fontSize:     '13px',
                    padding:      '0 8px',
                }}
            >
                <option value={0}>ICPC (ball yo'q)</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
                <option value={1500}>1500</option>
                <option value={2000}>2000</option>
                <option value={2500}>2500</option>
                <option value={3000}>3000</option>
            </select>
        </div>

        {/* Noto'g'ri urinish jarima */}
        <div>
            <div style={{
                fontSize:     '10px',
                color:        '#3a3a5a',
                marginBottom: '4px',
            }}>
                JARIMA (ball)
            </div>
            <input
                type="number"
                value={cp.wrong_penalty || 50}
                onChange={e => updateProblemPenalty(
                    cp.id, parseInt(e.target.value)
                )}
                min={0} max={500} step={50}
                style={{
                    width:        '100%',
                    height:       '32px',
                    background:   'rgba(255,255,255,0.04)',
                    border:       '1px solid rgba(255,255,255,0.09)',
                    borderRadius: '8px',
                    color:        '#e8e8f0',
                    fontSize:     '13px',
                    padding:      '0 8px',
                }}
            />
        </div>

        {/* O'chirish */}
        <button onClick={() => removeProblem(cp.id)}
            style={{
                background: 'none', border: 'none',
                cursor:     'pointer', color: '#3a3a5a',
            }}>
            <Trash2 size={13}/>
        </button>
    </div>
))}
```

---

## 4. MIGRATION

```bash
python manage.py makemigrations problems contests
python manage.py migrate
python manage.py check   # xato yo'q
```

---

## 5. TEKSHIRUV

### Ball hisoblash:

```python
python manage.py shell

# Masala: max_score=1000, decay=0.5, wrong_penalty=50
>>> from apps.problems.models import Problem
>>> p = Problem(max_score=1000, wrong_penalty=50)

# 10 daqiqada, 0 xato
>>> p.calculate_score(10, 0)
# 1000 - (1000//250)*10 - 50*0 = 1000 - 40 = 960

# 60 daqiqada, 2 xato
>>> p.calculate_score(60, 2)
# 1000 - 240 - 100 = 660

# 200 daqiqada, 5 xato (minimum = 300)
>>> p.calculate_score(200, 5)
# max(300, 1000 - 800 - 250) = max(300, -50) = 300
```

### Rating birinchi contest:

```python
>>> from apps.contests.rating_engine import calculate_rating_changes

>>> result = calculate_rating_changes([
...     {'user_id':1,'username':'yangi',
...      'old_rating':0,'rank':1,
...      'is_first_contest':True,   # ← YANGI QOIDA
...      'solved':3,'penalty':60},
...     {'user_id':2,'username':'tajribali',
...      'old_rating':1200,'rank':2,
...      'is_first_contest':False,
...      'solved':2,'penalty':90},
... ])

# Kutilayotgan:
# yangi:      0 → 200+ (katta musbat, o'rta dan boshlaydi)
# tajribali: 1200 → 1180 (taxminan)
```

---

## XULOSA

```
Rasmiy blog vs Bizning implementatsiya:

Mezon                   Blog     Biz      Natija
───────────────────────────────────────────────
Formula asosi           10       6        ✅ (6 to'g'ri)
Birinchi contest 1+n/2  ✅        ❌       ← TUZATISH
Zero-sum aniq           ✅        ⚠️       ← TUZATISH
Ball tizimi             ✅        ❌       ← YANGI
Div1/Div2 ajratish      ✅        ❌       Keyingi bosqich

Eng muhim o'zgarish:
  1. Birinchi contest: seed = 1 + n/2
  2. Ball tizimi: max_score, decay, wrong_penalty
  3. Scoreboard: ball bo'yicha tartiblash
```

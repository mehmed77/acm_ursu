from django.test import TestCase
from apps.contests.rating_engine import (
    calculate_rating_changes,
    get_rank_title,
    _win_probability,
)


class RatingEngineTest(TestCase):

    def _make(self, user_id, username, old_rating, rank,
              solved=3, penalty=90):
        return {
            'user_id':    user_id,
            'username':   username,
            'old_rating': old_rating,
            'rank':       rank,
            'solved':     solved,
            'penalty':    penalty,
        }

    def test_win_probability_equal_ratings(self):
        """Teng reytingda 50% ehtimol."""
        p = _win_probability(1200, 1200)
        self.assertAlmostEqual(p, 0.5, places=2)

    def test_win_probability_higher_wins_more(self):
        """Yuqori reyting ko'proq yutadi."""
        p_high = _win_probability(1600, 1200)
        p_low  = _win_probability(1200, 1600)
        self.assertGreater(p_high, p_low)
        self.assertGreater(p_high, 0.5)
        self.assertLess(p_low, 0.5)

    def test_two_equal_players_winner_gets_plus(self):
        """Teng reyting: g'olib + oladi, yutqazuvchi - oladi."""
        participants = [
            self._make(1, 'winner', 1200, rank=1),
            self._make(2, 'loser',  1200, rank=2),
        ]
        results = calculate_rating_changes(participants)
        winner = next(r for r in results if r['user_id'] == 1)
        loser  = next(r for r in results if r['user_id'] == 2)

        self.assertGreater(winner['delta'], 0)
        self.assertLess(loser['delta'], 0)
        self.assertEqual(winner['new_rating'], 1200 + winner['delta'])

    def test_single_participant_no_change(self):
        """1 ta ishtirokchi — reyting o'zgarmaydi."""
        participants = [self._make(1, 'solo', 1200, rank=1)]
        results = calculate_rating_changes(participants)
        self.assertEqual(results[0]['delta'], 0)
        self.assertEqual(results[0]['new_rating'], 1200)

    def test_first_place_can_get_negative_delta(self):
        """
        HAQIQIY CODEFORCES QOIDASI:
        1-o'rin ham minus reyting olishi mumkin —
        agar u juda kuchli va 1-o'rin kutilgan bo'lsa.
        """
        participants = [
            # Juda kuchli — 1-o'rin uning uchun kutilgan natija
            self._make(1, 'grandmaster', 2800, rank=1),
            # Juda zaif raqiblar
            self._make(2, 'newbie_1', 200, rank=2),
            self._make(3, 'newbie_2', 200, rank=3),
            self._make(4, 'newbie_3', 200, rank=4),
        ]
        results = calculate_rating_changes(participants)
        gm = next(r for r in results if r['user_id'] == 1)

        # new_rating >= 1 shart (qoida)
        self.assertGreaterEqual(gm['new_rating'], 1)

        # Delta manfiy bo'lishi MUMKIN va NORMAL
        # Eski xato assertion o'chirildi:
        # self.assertGreaterEqual(gm['delta'], 1)  ← NOTO'G'RI

    def test_first_place_big_plus_if_upset(self):
        """
        Kutilmagan 1-o'rin → katta musbat delta.
        Zaif ishtirokchi kuchlilarni yengsa — ko'p reyting oladi.
        """
        participants = [
            # Zaif — 1-o'rin kutilmagan
            self._make(1, 'underdog', 800, rank=1),
            # Kuchli raqiblar
            self._make(2, 'strong_1', 2000, rank=2),
            self._make(3, 'strong_2', 2000, rank=3),
        ]
        results = calculate_rating_changes(participants)
        underdog = next(r for r in results if r['user_id'] == 1)

        # Kutilmagan g'alaba → katta musbat delta
        self.assertGreater(underdog['delta'], 50,
            msg='Kutilmagan g\'alaba katta musbat delta berishi kerak')

    def test_weak_player_wins_gets_huge_plus(self):
        """
        Rating=1 dan boshlab 1-o'rin → maksimal musbat delta.
        """
        participants = [
            self._make(1, 'zero_rating', 1,    rank=1),
            self._make(2, 'master',      2100,  rank=2),
            self._make(3, 'expert',      1600,  rank=3),
        ]
        results = calculate_rating_changes(participants)
        zero = next(r for r in results if r['user_id'] == 1)

        self.assertGreater(zero['delta'], 0)
        self.assertGreaterEqual(zero['new_rating'], 1)

    def test_strong_player_loses_big_penalty(self):
        """
        Kuchli ishtirokchi oxirgi o'rinda — katta minus.
        """
        participants = [
            self._make(1, 'newbie',      200,  rank=1),
            self._make(2, 'newbie_2',    200,  rank=2),
            self._make(3, 'grandmaster', 2800, rank=3),
        ]
        results = calculate_rating_changes(participants)
        gm = next(r for r in results if r['user_id'] == 3)

        # Oxirgi o'rin → katta minus
        self.assertLess(gm['delta'], -50,
            msg='Kuchli ishtirokchi oxirgi o\'rinda katta minus olishi kerak')
        self.assertGreaterEqual(gm['new_rating'], 1)

    def test_minimum_rating_stays_1_not_zero(self):
        """
        Reyting hech qachon 0 yoki manfiy bo'lmaydi.
        """
        participants = [
            self._make(1, 'best',  1, rank=1),
            self._make(2, 'worst', 1, rank=2),
        ]
        results = calculate_rating_changes(participants)
        for r in results:
            self.assertGreaterEqual(
                r['new_rating'], 1,
                msg=f"{r['username']} rating 1 dan past bo'lmasligi kerak"
            )

    def test_tie_same_rank(self):
        """Teng o'rindagi ishtirokchilar bir xil delta oladi."""
        participants = [
            self._make(1, 'user_a', 1200, rank=1),
            self._make(2, 'user_b', 1200, rank=1),  # tie
            self._make(3, 'user_c', 1200, rank=3),
        ]
        results = calculate_rating_changes(participants)
        user_a = next(r for r in results if r['user_id'] == 1)
        user_b = next(r for r in results if r['user_id'] == 2)
        # Tie bo'lganda taxminan bir xil delta
        self.assertAlmostEqual(
            user_a['delta'], user_b['delta'], delta=5
        )

    def test_rank_titles(self):
        """Rank darajalari to'g'ri."""
        self.assertEqual(get_rank_title(0),    'Newbie')
        self.assertEqual(get_rank_title(799),  'Newbie')
        self.assertEqual(get_rank_title(800),  'Pupil')
        self.assertEqual(get_rank_title(1199), 'Pupil')
        self.assertEqual(get_rank_title(1200), 'Specialist')
        self.assertEqual(get_rank_title(1400), 'Expert')
        self.assertEqual(get_rank_title(1600), 'Candidate Master')
        self.assertEqual(get_rank_title(1900), 'Master')
        self.assertEqual(get_rank_title(2300), 'Grandmaster')
        self.assertEqual(get_rank_title(2600), 'Legendary Grandmaster')

    def test_rank_change_on_threshold(self):
        """Rank darajasi chegarada o'zgaradi."""
        participants = [
            self._make(1, 'almost_pupil', 799, rank=1),
            self._make(2, 'strong',       1000, rank=2),
        ]
        results = calculate_rating_changes(participants)
        winner = next(r for r in results if r['user_id'] == 1)

        if winner['new_rating'] >= 800:
            self.assertEqual(winner['new_rank_title'], 'Pupil')
        else:
            self.assertEqual(winner['new_rank_title'], 'Newbie')

    def test_ten_participants(self):
        """10 ta ishtirokchi — barcha natijalar to'g'ri."""
        participants = [
            self._make(i+1, f'user_{i+1}', 1000 + i*100, rank=i+1)
            for i in range(10)
        ]
        results = calculate_rating_changes(participants)

        self.assertEqual(len(results), 10)

        # Barcha new_rating >= 1
        for r in results:
            self.assertGreaterEqual(r['new_rating'], 1)

        # 1-o'rin >= +1
        first = min(results, key=lambda x: x['rank'])
        self.assertGreaterEqual(first['delta'], 1)

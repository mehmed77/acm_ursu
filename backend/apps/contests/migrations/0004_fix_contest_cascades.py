from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('contests', '0003_alter_contest_slug'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                # ContestRegistration
                "ALTER TABLE contests_contestregistration DROP CONSTRAINT IF EXISTS contests_contestregi_contest_id_1dc4659a_fk_contests_;",
                "ALTER TABLE contests_contestregistration ADD CONSTRAINT contests_contestregi_contest_id_1dc4659a_fk_contests_ FOREIGN KEY (contest_id) REFERENCES contests_contest(id) ON DELETE CASCADE;",
                
                "ALTER TABLE contests_contestregistration DROP CONSTRAINT IF EXISTS contests_contestregi_user_id_00d0ce4e_fk_accounts_;",
                "ALTER TABLE contests_contestregistration ADD CONSTRAINT contests_contestregi_user_id_00d0ce4e_fk_accounts_ FOREIGN KEY (user_id) REFERENCES accounts_user(id) ON DELETE CASCADE;",
                
                "ALTER TABLE contests_contestregistration DROP CONSTRAINT IF EXISTS contests_contestregi_team_id_8c7c26aa_fk_contests_;",
                "ALTER TABLE contests_contestregistration ADD CONSTRAINT contests_contestregi_team_id_8c7c26aa_fk_contests_ FOREIGN KEY (team_id) REFERENCES contests_team(id) ON DELETE SET NULL;",

                # ContestSubmission
                "ALTER TABLE contests_contestsubmission DROP CONSTRAINT IF EXISTS contests_contestsubm_contest_id_a07fb585_fk_contests_;",
                "ALTER TABLE contests_contestsubmission ADD CONSTRAINT contests_contestsubm_contest_id_a07fb585_fk_contests_ FOREIGN KEY (contest_id) REFERENCES contests_contest(id) ON DELETE CASCADE;",
                
                "ALTER TABLE contests_contestsubmission DROP CONSTRAINT IF EXISTS contests_contestsubm_contest_problem_id_b2feb742_fk_contests_;",
                "ALTER TABLE contests_contestsubmission ADD CONSTRAINT contests_contestsubm_contest_problem_id_b2feb742_fk_contests_ FOREIGN KEY (contest_problem_id) REFERENCES contests_contestproblem(id) ON DELETE CASCADE;",
                
                "ALTER TABLE contests_contestsubmission DROP CONSTRAINT IF EXISTS contests_contestsubmission_user_id_1ad57f50_fk_accounts_user_id;",
                "ALTER TABLE contests_contestsubmission ADD CONSTRAINT contests_contestsubmission_user_id_1ad57f50_fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES accounts_user(id) ON DELETE CASCADE;",
                
                "ALTER TABLE contests_contestsubmission DROP CONSTRAINT IF EXISTS contests_contestsubm_problem_id_32d15770_fk_problems_;",
                "ALTER TABLE contests_contestsubmission ADD CONSTRAINT contests_contestsubm_problem_id_32d15770_fk_problems_ FOREIGN KEY (problem_id) REFERENCES problems_problem(id) ON DELETE CASCADE;",
                
                "ALTER TABLE contests_contestsubmission DROP CONSTRAINT IF EXISTS contests_contestsubmission_team_id_71199602_fk_contests_team_id;",
                "ALTER TABLE contests_contestsubmission ADD CONSTRAINT contests_contestsubmission_team_id_71199602_fk_contests_team_id FOREIGN KEY (team_id) REFERENCES contests_team(id) ON DELETE SET NULL;",

                # ScoreboardEntry
                "ALTER TABLE contests_scoreboardentry DROP CONSTRAINT IF EXISTS contests_scoreboarde_contest_id_1e8c9a84_fk_contests_;",
                "ALTER TABLE contests_scoreboardentry ADD CONSTRAINT contests_scoreboarde_contest_id_1e8c9a84_fk_contests_ FOREIGN KEY (contest_id) REFERENCES contests_contest(id) ON DELETE CASCADE;",
                
                "ALTER TABLE contests_scoreboardentry DROP CONSTRAINT IF EXISTS contests_scoreboardentry_user_id_2515178e_fk_accounts_user_id;",
                "ALTER TABLE contests_scoreboardentry ADD CONSTRAINT contests_scoreboardentry_user_id_2515178e_fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES accounts_user(id) ON DELETE SET NULL;",
                
                "ALTER TABLE contests_scoreboardentry DROP CONSTRAINT IF EXISTS contests_scoreboardentry_team_id_62a4bb36_fk_contests_team_id;",
                "ALTER TABLE contests_scoreboardentry ADD CONSTRAINT contests_scoreboardentry_team_id_62a4bb36_fk_contests_team_id FOREIGN KEY (team_id) REFERENCES contests_team(id) ON DELETE SET NULL;",

                # Team
                "ALTER TABLE contests_team DROP CONSTRAINT IF EXISTS contests_team_contest_id_244b0273_fk_contests_contest_id;",
                "ALTER TABLE contests_team ADD CONSTRAINT contests_team_contest_id_244b0273_fk_contests_contest_id FOREIGN KEY (contest_id) REFERENCES contests_contest(id) ON DELETE CASCADE;",
                
                "ALTER TABLE contests_team DROP CONSTRAINT IF EXISTS contests_team_leader_id_57dbe94b_fk_accounts_user_id;",
                "ALTER TABLE contests_team ADD CONSTRAINT contests_team_leader_id_57dbe94b_fk_accounts_user_id FOREIGN KEY (leader_id) REFERENCES accounts_user(id) ON DELETE CASCADE;",

                # TeamMember
                "ALTER TABLE contests_teammember DROP CONSTRAINT IF EXISTS contests_teammember_team_id_d6754527_fk_contests_team_id;",
                "ALTER TABLE contests_teammember ADD CONSTRAINT contests_teammember_team_id_d6754527_fk_contests_team_id FOREIGN KEY (team_id) REFERENCES contests_team(id) ON DELETE CASCADE;",
                
                "ALTER TABLE contests_teammember DROP CONSTRAINT IF EXISTS contests_teammember_user_id_29d29050_fk_accounts_user_id;",
                "ALTER TABLE contests_teammember ADD CONSTRAINT contests_teammember_user_id_29d29050_fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES accounts_user(id) ON DELETE CASCADE;",

                # RatingChange
                "ALTER TABLE contests_ratingchange DROP CONSTRAINT IF EXISTS contests_ratingchang_contest_id_3ef19bd8_fk_contests_;",
                "ALTER TABLE contests_ratingchange ADD CONSTRAINT contests_ratingchang_contest_id_3ef19bd8_fk_contests_ FOREIGN KEY (contest_id) REFERENCES contests_contest(id) ON DELETE CASCADE;",
                
                "ALTER TABLE contests_ratingchange DROP CONSTRAINT IF EXISTS contests_ratingchange_user_id_e1c621f2_fk_accounts_user_id;",
                "ALTER TABLE contests_ratingchange ADD CONSTRAINT contests_ratingchange_user_id_e1c621f2_fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES accounts_user(id) ON DELETE CASCADE;",

                # ContestProblem
                "ALTER TABLE contests_contestproblem DROP CONSTRAINT IF EXISTS contests_contestprob_contest_id_41345d1e_fk_contests_;",
                "ALTER TABLE contests_contestproblem ADD CONSTRAINT contests_contestprob_contest_id_41345d1e_fk_contests_ FOREIGN KEY (contest_id) REFERENCES contests_contest(id) ON DELETE CASCADE;",
                
                "ALTER TABLE contests_contestproblem DROP CONSTRAINT IF EXISTS contests_contestprob_problem_id_e4339dcf_fk_problems_;",
                "ALTER TABLE contests_contestproblem ADD CONSTRAINT contests_contestprob_problem_id_e4339dcf_fk_problems_ FOREIGN KEY (problem_id) REFERENCES problems_problem(id) ON DELETE CASCADE;",
                # Contest
                "ALTER TABLE contests_contest DROP CONSTRAINT IF EXISTS contests_contest_created_by_id_85dab57f_fk_accounts_user_id;",
                "ALTER TABLE contests_contest ADD CONSTRAINT contests_contest_created_by_id_85dab57f_fk_accounts_user_id FOREIGN KEY (created_by_id) REFERENCES accounts_user(id) ON DELETE SET NULL;",

                # ContestSubmission (OneToOne)
                "ALTER TABLE contests_contestsubmission DROP CONSTRAINT IF EXISTS contests_contestsubm_submission_id_d13d62df_fk_submissio;",
                "ALTER TABLE contests_contestsubmission ADD CONSTRAINT contests_contestsubm_submission_id_d13d62df_fk_submissio FOREIGN KEY (submission_id) REFERENCES submissions_submission(id) ON DELETE CASCADE;",
            ],
            reverse_sql=[],
        ),
    ]

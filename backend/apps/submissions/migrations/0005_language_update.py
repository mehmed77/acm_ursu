# Generated manually for Language enum expansion + new fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('submissions', '0004_alter_submission_status'),
    ]

    operations = [
        # 1. Expand Language choices (alter field to accept new values)
        migrations.AlterField(
            model_name='submission',
            name='language',
            field=models.CharField(
                choices=[
                    ('python',     'Python 3.13'),
                    ('cpp',        'GNU C++ 17'),
                    ('java',       'Java 17'),
                    ('javascript', 'Node.js 20'),
                    ('pascal',     'Free Pascal 3.2'),
                    ('csharp',     'C# (.NET 8)'),
                    ('golang',     'Go 1.22'),
                    ('pypy',       'PyPy 3.11'),
                    ('msvc_cpp',   'C++ (MSVC-compatible)'),
                ],
                max_length=20,
            ),
        ),

        # 2. Expand Status choices (add system_error)
        migrations.AlterField(
            model_name='submission',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending',              'Pending'),
                    ('running',              'Running'),
                    ('accepted',             'Accepted'),
                    ('wrong_answer',         'Wrong Answer'),
                    ('time_limit_exceeded',  'Time Limit Exceeded'),
                    ('memory_limit_exceeded', 'Memory Limit Exceeded'),
                    ('runtime_error',        'Runtime Error'),
                    ('compilation_error',    'Compilation Error'),
                    ('security_violation',   'Security Violation'),
                    ('system_error',         'System Error'),
                ],
                default='pending',
                max_length=30,
            ),
        ),

        # 3. Add test_results JSONField
        migrations.AddField(
            model_name='submission',
            name='test_results',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Har bir test natijasi: [{'test_case_id': 1, 'status': 'accepted', ...}]",
            ),
        ),

        # 4. Add compile_output TextField
        migrations.AddField(
            model_name='submission',
            name='compile_output',
            field=models.TextField(
                blank=True,
                default='',
                help_text='Compilation output (errors/warnings)',
            ),
        ),

        # 5. Add finished_at DateTimeField
        migrations.AddField(
            model_name='submission',
            name='finished_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text='Judge tugagan vaqt',
            ),
        ),

        # 6. Add indexes for query performance
        migrations.AddIndex(
            model_name='submission',
            index=models.Index(
                fields=['user', 'problem', '-created_at'],
                name='submissions_user_prob_created_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='submission',
            index=models.Index(
                fields=['status', '-created_at'],
                name='submissions_status_created_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='submission',
            index=models.Index(
                fields=['-created_at'],
                name='submissions_created_desc_idx',
            ),
        ),
    ]

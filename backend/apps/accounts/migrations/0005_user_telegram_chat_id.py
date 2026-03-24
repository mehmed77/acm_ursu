from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_user_hemis_data_hash'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='telegram_chat_id',
            field=models.BigIntegerField(
                null=True, blank=True,
                help_text="Telegram chat ID — bot orqali bog'langan",
            ),
        ),
    ]

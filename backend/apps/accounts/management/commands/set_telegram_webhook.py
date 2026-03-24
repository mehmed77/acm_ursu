"""
Telegram bot webhook ni o'rnatish uchun management command.

Ishlatish:
    python manage.py set_telegram_webhook https://yourdomain.com

Bu command:
  1. Bot tokenini tekshiradi
  2. Telegram API ga webhook URL ni ro'yxatdan o'tkazadi
  3. Natijani ko'rsatadi

Misol:
    python manage.py set_telegram_webhook https://judge.example.com
    # => https://judge.example.com/api/auth/telegram/webhook/ ga o'rnatadi
"""

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings

from apps.accounts.telegram_service import set_webhook, get_webhook_info, delete_webhook


class Command(BaseCommand):
    help = "Telegram bot webhook URL ni o'rnatish yoki o'chirish"

    def add_arguments(self, parser):
        parser.add_argument(
            'domain',
            nargs='?',
            type=str,
            help=(
                "Server domain (https://yourdomain.com). "
                "Ko'rsatilmasa — joriy webhook ma'lumotini ko'rsatadi."
            ),
        )
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Webhookni o\'chirish (long-polling rejimi uchun)',
        )
        parser.add_argument(
            '--info',
            action='store_true',
            help='Joriy webhook ma\'lumotini ko\'rsatish',
        )

    def handle(self, *args, **options):
        token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
        if not token:
            raise CommandError(
                'TELEGRAM_BOT_TOKEN sozlanmagan. '
                '.env faylga qo\'shing va qayta urinib ko\'ring.'
            )

        # ── --info ──────────────────────────────────────
        if options['info']:
            result = get_webhook_info()
            if result.get('ok'):
                info = result.get('result', {})
                url = info.get('url') or '(o\'rnatilmagan)'
                pending = info.get('pending_update_count', 0)
                self.stdout.write(f'Webhook URL    : {url}')
                self.stdout.write(f'Pending updates: {pending}')
                last_error = info.get('last_error_message')
                if last_error:
                    self.stdout.write(
                        self.style.WARNING(f'Oxirgi xato     : {last_error}')
                    )
            else:
                self.stdout.write(self.style.ERROR(f'Xato: {result}'))
            return

        # ── --delete ─────────────────────────────────────
        if options['delete']:
            result = delete_webhook()
            if result.get('ok'):
                self.stdout.write(self.style.SUCCESS('Webhook o\'chirildi.'))
            else:
                self.stdout.write(self.style.ERROR(f'Xato: {result}'))
            return

        # ── O'rnatish ────────────────────────────────────
        domain = options.get('domain')
        if not domain:
            raise CommandError(
                'Domain ko\'rsatilishi shart. '
                'Misol: python manage.py set_telegram_webhook https://yourdomain.com'
            )

        domain   = domain.rstrip('/')
        full_url = f'{domain}/api/auth/telegram/webhook/'
        secret   = getattr(settings, 'TELEGRAM_WEBHOOK_SECRET', '') or None

        self.stdout.write(f'Webhook o\'rnatilmoqda: {full_url}')
        result = set_webhook(full_url, secret=secret)

        if result.get('ok'):
            self.stdout.write(self.style.SUCCESS(
                f'✅ Webhook muvaffaqiyatli o\'rnatildi!\n'
                f'   URL: {full_url}\n'
                f'   Secret: {"ha" if secret else "yo\'q"}'
            ))
        else:
            raise CommandError(
                f'Webhook o\'rnatishda xato: {result.get("description", result)}'
            )

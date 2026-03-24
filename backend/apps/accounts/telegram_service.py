"""
Telegram Bot API wrapper — stdlib only (urllib), no extra dependencies.

Funksiyalar:
  send_message(chat_id, text)  — foydalanuvchiga xabar yuborish
  set_webhook(url, secret)     — bot webhook ni ro'yxatdan o'tkazish
  delete_webhook()             — webhookni o'chirish (polling uchun)

Sozlamalar (settings.py):
  TELEGRAM_BOT_TOKEN       — @BotFather dan olingan token
  TELEGRAM_BOT_USERNAME    — bot username (@ belgisisiz)
  TELEGRAM_WEBHOOK_SECRET  — Telegram ga berilgan secret token (ixtiyoriy)
"""

import json
import logging
import urllib.error
import urllib.request
from typing import Any, Dict, Optional

from django.conf import settings

logger = logging.getLogger(__name__)

_API_BASE = 'https://api.telegram.org/bot{token}/{method}'


def _call(method: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Telegram Bot API ga POST so'rov yuboradi."""
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
    if not token:
        logger.warning('[TG] TELEGRAM_BOT_TOKEN sozlanmagan')
        return {'ok': False, 'description': 'Bot token missing'}

    url  = _API_BASE.format(token=token, method=method)
    data = json.dumps(payload).encode('utf-8')

    req = urllib.request.Request(
        url,
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        logger.error('[TG] %s HTTP %s: %s', method, e.code, body[:300])
        try:
            return json.loads(body)
        except Exception:
            return {'ok': False, 'description': body[:200]}
    except Exception as exc:
        logger.error('[TG] %s exception: %s', method, exc)
        return {'ok': False, 'description': str(exc)}


def send_message(chat_id: int, text: str, parse_mode: str = 'HTML') -> bool:
    """
    Foydalanuvchiga Telegram xabari yuboradi.
    Returns True agar muvaffaqiyatli.
    """
    result = _call('sendMessage', {
        'chat_id':    chat_id,
        'text':       text,
        'parse_mode': parse_mode,
    })
    if not result.get('ok'):
        logger.warning('[TG] sendMessage failed chat=%s: %s', chat_id, result.get('description'))
    return bool(result.get('ok'))


def set_webhook(url: str, secret: Optional[str] = None) -> Dict[str, Any]:
    """
    Bot uchun webhook URL ni ro'yxatdan o'tkazadi.
    secret — Telegram har so'rovda X-Telegram-Bot-Api-Secret-Token headerida yuboradi.
    """
    payload: Dict[str, Any] = {'url': url, 'allowed_updates': ['message']}
    if secret:
        payload['secret_token'] = secret
    return _call('setWebhook', payload)


def delete_webhook() -> Dict[str, Any]:
    """Webhookni o'chiradi (long-polling uchun)."""
    return _call('deleteWebhook', {'drop_pending_updates': False})


def get_webhook_info() -> Dict[str, Any]:
    """Joriy webhook ma'lumotini qaytaradi."""
    return _call('getWebhookInfo', {})

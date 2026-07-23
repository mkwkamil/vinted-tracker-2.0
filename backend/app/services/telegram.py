from __future__ import annotations

import logging
from datetime import datetime
from zoneinfo import ZoneInfo

import httpx

from app.config import Settings, get_settings
from app.services.vinted_client import ParsedItem

logger = logging.getLogger(__name__)
WARSAW = ZoneInfo("Europe/Warsaw")


class TelegramNotifier:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    @property
    def enabled(self) -> bool:
        return bool(self.settings.telegram_bot_token and self.settings.chat_id_list)

    def format_caption(self, item: ParsedItem, when: datetime | None = None) -> str:
        stamp = when or datetime.now(tz=WARSAW)
        time_str = stamp.astimezone(WARSAW).strftime("%H:%M")
        price = self._fmt_money(item.price)
        total = self._fmt_money(item.total_price)
        currency = item.currency or "PLN"
        return (
            f"Title: *{self._escape_md(item.title)}*\n"
            f"Brand: *{self._escape_md(item.brand or '-')}*\n"
            f"Size: *{self._escape_md(item.size or '-')}*\n"
            f"Price: *{price} {currency}* ({total} {currency})\n"
            f"{time_str}"
        )

    async def send_item(self, item: ParsedItem) -> bool:
        if not self.enabled:
            logger.warning("Telegram is not configured; skipping notification for %s", item.vinted_id)
            return False

        caption = self.format_caption(item)
        keyboard = {
            "inline_keyboard": [[{"text": "Buy Now ↗", "url": item.item_url}]],
        }

        url = f"https://api.telegram.org/bot{self.settings.telegram_bot_token}/sendPhoto"
        ok = True
        async with httpx.AsyncClient(timeout=30) as client:
            for chat_id in self.settings.chat_id_list:
                payload = {
                    "chat_id": chat_id,
                    "photo": item.photo_url or item.item_url,
                    "caption": caption,
                    "parse_mode": "Markdown",
                    "reply_markup": keyboard,
                }
                # If no photo URL, fall back to text message
                if not item.photo_url:
                    text_url = f"https://api.telegram.org/bot{self.settings.telegram_bot_token}/sendMessage"
                    text_payload = {
                        "chat_id": chat_id,
                        "text": caption,
                        "parse_mode": "Markdown",
                        "reply_markup": keyboard,
                    }
                    response = await client.post(text_url, json=text_payload)
                else:
                    response = await client.post(url, json=payload)

                if response.status_code >= 400:
                    ok = False
                    logger.error(
                        "Telegram send failed for chat %s: %s %s",
                        chat_id,
                        response.status_code,
                        response.text,
                    )
        return ok

    @staticmethod
    def _fmt_money(value) -> str:
        try:
            num = float(value)
        except (TypeError, ValueError):
            return str(value)
        if num == int(num):
            return str(int(num))
        return f"{num:.2f}".rstrip("0").rstrip(".")

    @staticmethod
    def _escape_md(text: str) -> str:
        # Escape Telegram legacy Markdown special chars in user content
        for ch in ("_", "*", "`", "["):
            text = text.replace(ch, f"\\{ch}")
        return text

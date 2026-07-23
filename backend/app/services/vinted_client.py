from __future__ import annotations

import logging
import random
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from urllib.parse import urlparse

from curl_cffi.requests import AsyncSession

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


@dataclass
class ParsedItem:
    vinted_id: int
    title: str
    brand: str
    size: str
    price: Decimal
    total_price: Decimal
    currency: str
    photo_url: str
    item_url: str
    listed_at: datetime | None


class VintedClient:
    """Lightweight Vinted catalog client using TLS browser impersonation."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._session: AsyncSession | None = None
        self._session_ready = False

    async def start(self) -> None:
        if self._session is None:
            self._session = AsyncSession(impersonate="chrome")
        await self.refresh_session()

    async def close(self) -> None:
        if self._session is not None:
            await self._session.close()
            self._session = None
            self._session_ready = False

    async def refresh_session(self) -> None:
        if self._session is None:
            self._session = AsyncSession(impersonate="chrome")

        headers = self._browser_headers()
        logger.info("Refreshing Vinted session cookies...")
        response = await self._session.get(
            self.settings.vinted_base_url,
            headers=headers,
            timeout=30,
            allow_redirects=True,
        )
        if response.status_code >= 400:
            logger.warning("Session bootstrap returned HTTP %s", response.status_code)
        self._session_ready = True
        logger.info("Vinted session ready")

    async def fetch_catalog(self, catalog_url: str) -> list[ParsedItem]:
        if not self._session_ready:
            await self.refresh_session()

        assert self._session is not None
        headers = self._api_headers()

        response = await self._session.get(catalog_url, headers=headers, timeout=30)
        if response.status_code in (401, 403, 429):
            logger.warning("Catalog request blocked (%s), refreshing session", response.status_code)
            await self.refresh_session()
            response = await self._session.get(catalog_url, headers=headers, timeout=30)

        response.raise_for_status()
        payload = response.json()
        items = payload.get("items") or payload.get("catalog_items") or []
        return [parsed for item in items if (parsed := self._parse_item(item)) is not None]

    def _parse_item(self, raw: dict[str, Any]) -> ParsedItem | None:
        try:
            vinted_id = int(raw.get("id") or raw.get("item_id"))
        except (TypeError, ValueError):
            return None

        title = str(raw.get("title") or raw.get("name") or "Untitled")
        brand = self._extract_brand(raw)
        size = self._extract_size(raw)
        price, total_price, currency = self._extract_prices(raw)
        photo_url = self._extract_photo(raw)
        item_url = self._extract_url(raw)
        listed_at = self._extract_listed_at(raw)

        return ParsedItem(
            vinted_id=vinted_id,
            title=title,
            brand=brand,
            size=size,
            price=price,
            total_price=total_price,
            currency=currency,
            photo_url=photo_url,
            item_url=item_url,
            listed_at=listed_at,
        )

    @staticmethod
    def _extract_brand(raw: dict[str, Any]) -> str:
        brand = raw.get("brand_title") or raw.get("brand")
        if isinstance(brand, dict):
            return str(brand.get("title") or brand.get("name") or "")
        return str(brand or "")

    @staticmethod
    def _extract_size(raw: dict[str, Any]) -> str:
        size = raw.get("size_title") or raw.get("size")
        if isinstance(size, dict):
            return str(size.get("title") or size.get("name") or "")
        return str(size or "")

    @staticmethod
    def _extract_prices(raw: dict[str, Any]) -> tuple[Decimal, Decimal, str]:
        currency = "PLN"
        price_obj = raw.get("price")
        total_obj = raw.get("total_item_price") or raw.get("service_fee")

        if isinstance(price_obj, dict):
            amount = price_obj.get("amount") or price_obj.get("value") or "0"
            currency = str(price_obj.get("currency_code") or price_obj.get("currency") or currency)
            price = Decimal(str(amount))
        else:
            price = Decimal(str(price_obj or raw.get("price_numeric") or "0"))

        if isinstance(total_obj, dict):
            total_amount = total_obj.get("amount") or total_obj.get("value")
            if total_amount is not None:
                total_price = Decimal(str(total_amount))
            else:
                total_price = price
            currency = str(total_obj.get("currency_code") or total_obj.get("currency") or currency)
        elif total_obj is not None and not isinstance(total_obj, dict):
            # Sometimes service_fee is separate; prefer total_item_price fields
            total_price = price
        else:
            total_price = price

        # Prefer explicit total_item_price if present as nested under item
        tip = raw.get("total_item_price")
        if isinstance(tip, dict) and tip.get("amount") is not None:
            total_price = Decimal(str(tip["amount"]))
            currency = str(tip.get("currency_code") or tip.get("currency") or currency)
        elif isinstance(tip, (int, float, str)):
            total_price = Decimal(str(tip))

        return price, total_price, currency

    @staticmethod
    def _extract_photo(raw: dict[str, Any]) -> str:
        photo = raw.get("photo") or {}
        if isinstance(photo, list) and photo:
            photo = photo[0]
        if not isinstance(photo, dict):
            return ""

        thumbnails = photo.get("thumbnails") or []
        if isinstance(thumbnails, list) and thumbnails:
            # Prefer smallest / low-res thumbnail to save Telegram bandwidth
            def thumb_area(t: dict[str, Any]) -> int:
                return int(t.get("width") or 0) * int(t.get("height") or 0)

            valid = [t for t in thumbnails if isinstance(t, dict) and t.get("url")]
            if valid:
                smallest = min(valid, key=thumb_area)
                return str(smallest["url"])

        for key in ("url", "full_size_url", "high_resolution", "image_no_placeholder"):
            value = photo.get(key)
            if isinstance(value, str) and value:
                return value
            if isinstance(value, dict) and value.get("url"):
                return str(value["url"])
        return ""

    def _extract_url(self, raw: dict[str, Any]) -> str:
        path = raw.get("url") or raw.get("path") or ""
        if isinstance(path, str) and path.startswith("http"):
            return path
        if isinstance(path, str) and path.startswith("/"):
            return f"{self.settings.vinted_base_url.rstrip('/')}{path}"
        item_id = raw.get("id")
        if item_id:
            return f"{self.settings.vinted_base_url.rstrip('/')}/items/{item_id}"
        return self.settings.vinted_base_url

    @staticmethod
    def _extract_listed_at(raw: dict[str, Any]) -> datetime | None:
        for key in ("photo_high_resolution", "created_at_ts", "created_at"):
            value = raw.get(key)
            if key == "photo_high_resolution" and isinstance(value, dict):
                ts = value.get("timestamp")
                if ts:
                    try:
                        return datetime.fromtimestamp(int(ts), tz=timezone.utc)
                    except (TypeError, ValueError, OSError):
                        pass
            if key == "created_at_ts" and value:
                try:
                    return datetime.fromtimestamp(int(value), tz=timezone.utc)
                except (TypeError, ValueError, OSError):
                    pass
            if key == "created_at" and isinstance(value, str):
                try:
                    return datetime.fromisoformat(value.replace("Z", "+00:00"))
                except ValueError:
                    pass

        photo = raw.get("photo") or {}
        if isinstance(photo, dict):
            high_res = photo.get("high_resolution") or {}
            if isinstance(high_res, dict) and high_res.get("timestamp"):
                try:
                    return datetime.fromtimestamp(int(high_res["timestamp"]), tz=timezone.utc)
                except (TypeError, ValueError, OSError):
                    pass
        return None

    def _browser_headers(self) -> dict[str, str]:
        return {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pl,en;q=0.9",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Upgrade-Insecure-Requests": "1",
        }

    def _api_headers(self) -> dict[str, str]:
        parsed = urlparse(self.settings.vinted_base_url)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        return {
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "pl,en;q=0.9",
            "Referer": f"{origin}/",
            "Origin": origin,
            "X-Requested-With": "XMLHttpRequest",
        }


def random_poll_delay(settings: Settings | None = None) -> float:
    cfg = settings or get_settings()
    return random.uniform(cfg.poll_min_seconds, cfg.poll_max_seconds)

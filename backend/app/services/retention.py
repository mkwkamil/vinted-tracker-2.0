from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.models import TrackedItem

logger = logging.getLogger(__name__)


async def cleanup_old_items(session: AsyncSession, settings: Settings | None = None) -> int:
    cfg = settings or get_settings()
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=cfg.offer_retention_days)
    result = await session.execute(delete(TrackedItem).where(TrackedItem.seen_at < cutoff))
    deleted = result.rowcount or 0
    if deleted:
        logger.info("Retention cleanup removed %s items older than %s days", deleted, cfg.offer_retention_days)
    await session.commit()
    return deleted

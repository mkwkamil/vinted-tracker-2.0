from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from app.config import get_settings
from app.db import AsyncSessionLocal, init_db
from app.models import SearchFilter, TrackedItem
from app.services.delivery_schedule import roll_forward_all_stores
from app.services.retention import cleanup_old_items
from app.services.telegram import TelegramNotifier
from app.services.vinted_client import ParsedItem, VintedClient, random_poll_delay

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [%(name)s] %(message)s")
logger = logging.getLogger("worker")


@dataclass(frozen=True)
class FilterSnapshot:
    id: UUID
    name: str
    catalog_url: str


async def _filter_item_count(filter_id: UUID) -> int:
    async with AsyncSessionLocal() as session:
        result = await session.scalar(
            select(func.count()).select_from(TrackedItem).where(TrackedItem.filter_id == filter_id)
        )
        return int(result or 0)


def _tracked_to_parsed(tracked: TrackedItem) -> ParsedItem:
    return ParsedItem(
        vinted_id=tracked.vinted_id,
        title=tracked.title,
        brand=tracked.brand,
        size=tracked.size,
        price=tracked.price,
        total_price=tracked.total_price,
        currency=tracked.currency,
        photo_url=tracked.photo_url,
        item_url=tracked.item_url,
        listed_at=tracked.listed_at,
    )


async def retry_unnotified(notifier: TelegramNotifier, filter_id: UUID) -> int:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(TrackedItem).where(
                TrackedItem.filter_id == filter_id,
                TrackedItem.notified.is_(False),
            )
        )
        pending = list(result.scalars().all())

    retried = 0
    for tracked in pending:
        sent = await notifier.send_item(_tracked_to_parsed(tracked))
        if sent:
            async with AsyncSessionLocal() as session:
                row = await session.get(TrackedItem, tracked.id)
                if row:
                    row.notified = True
                    await session.commit()
            retried += 1

    if retried:
        logger.info("Retried %s pending Telegram notification(s) for filter %s", retried, filter_id)
    return retried


async def poll_filter(
    client: VintedClient,
    notifier: TelegramNotifier,
    filt: FilterSnapshot,
) -> None:
    await retry_unnotified(notifier, filt.id)

    items = await client.fetch_catalog(filt.catalog_url)
    existing_count = await _filter_item_count(filt.id)
    seed_mode = existing_count == 0

    if seed_mode:
        async with AsyncSessionLocal() as session:
            for item in items:
                stmt = (
                    insert(TrackedItem)
                    .values(
                        vinted_id=item.vinted_id,
                        filter_id=filt.id,
                        title=item.title,
                        brand=item.brand,
                        size=item.size,
                        price=item.price,
                        total_price=item.total_price,
                        currency=item.currency,
                        photo_url=item.photo_url,
                        item_url=item.item_url,
                        listed_at=item.listed_at,
                        seen_at=datetime.now(tz=timezone.utc),
                        notified=False,
                    )
                    .on_conflict_do_nothing(index_elements=["vinted_id"])
                )
                await session.execute(stmt)
            await session.commit()
        logger.info("Seeded filter '%s' with %s items (no notifications)", filt.name, len(items))
        return

    new_count = 0
    for item in items:
        async with AsyncSessionLocal() as session:
            stmt = (
                insert(TrackedItem)
                .values(
                    vinted_id=item.vinted_id,
                    filter_id=filt.id,
                    title=item.title,
                    brand=item.brand,
                    size=item.size,
                    price=item.price,
                    total_price=item.total_price,
                    currency=item.currency,
                    photo_url=item.photo_url,
                    item_url=item.item_url,
                    listed_at=item.listed_at,
                    seen_at=datetime.now(tz=timezone.utc),
                    notified=False,
                )
                .on_conflict_do_nothing(index_elements=["vinted_id"])
                .returning(TrackedItem.vinted_id)
            )
            result = await session.execute(stmt)
            inserted_id = result.scalar_one_or_none()
            if inserted_id is None:
                await session.rollback()
                continue
            await session.commit()

        new_count += 1
        sent = await notifier.send_item(item)
        if sent:
            async with AsyncSessionLocal() as session:
                tracked = await session.scalar(
                    select(TrackedItem).where(TrackedItem.vinted_id == item.vinted_id)
                )
                if tracked:
                    tracked.notified = True
                    await session.commit()

    if new_count:
        logger.info("Filter '%s': %s new item(s) notified", filt.name, new_count)
    else:
        logger.info("Filter '%s': no new items", filt.name)


async def filter_loop(
    client: VintedClient,
    notifier: TelegramNotifier,
    filter_id: UUID,
) -> None:
    settings = get_settings()
    while True:
        try:
            async with AsyncSessionLocal() as session:
                filt = await session.get(SearchFilter, filter_id)
                if not filt or not filt.is_active:
                    logger.info("Filter %s inactive or deleted; stopping loop", filter_id)
                    return
                snapshot = FilterSnapshot(id=filt.id, name=filt.name, catalog_url=filt.catalog_url)

            await poll_filter(client, notifier, snapshot)
        except Exception:
            logger.exception("Error while polling filter %s", filter_id)

        await asyncio.sleep(random_poll_delay(settings))


async def supervisor(client: VintedClient, notifier: TelegramNotifier) -> None:
    settings = get_settings()
    tasks: dict[UUID, asyncio.Task] = {}
    last_cleanup = datetime.now(tz=timezone.utc)

    while True:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(SearchFilter).where(SearchFilter.is_active.is_(True)))
            active = list(result.scalars().all())
            active_ids = {f.id for f in active}

            for filt in active:
                existing = tasks.get(filt.id)
                if existing is None or existing.done():
                    logger.info("Starting poll loop for '%s'", filt.name)
                    tasks[filt.id] = asyncio.create_task(
                        filter_loop(client, notifier, filt.id),
                        name=f"filter-{filt.id}",
                    )

            for fid in list(tasks.keys()):
                if fid not in active_ids:
                    tasks[fid].cancel()
                    tasks.pop(fid, None)

            now = datetime.now(tz=timezone.utc)
            if (now - last_cleanup).total_seconds() >= 3600:
                await cleanup_old_items(session, settings)
                await roll_forward_all_stores(session)
                last_cleanup = now

        await asyncio.sleep(15)


async def _session_refresher(client: VintedClient) -> None:
    settings = get_settings()
    while True:
        await asyncio.sleep(settings.session_refresh_minutes * 60)
        try:
            await client.refresh_session()
        except Exception:
            logger.exception("Periodic session refresh failed")


async def _idle_forever() -> None:
    """Keep the container alive without polling Vinted when the feature is off."""
    while True:
        await asyncio.sleep(3600)


async def main() -> None:
    settings = get_settings()
    await init_db()

    if not settings.enable_vinted:
        logger.info("ENABLE_VINTED=false — Vinted polling disabled; worker idle")
        await _idle_forever()
        return

    logger.info(
        "Worker starting (poll %s–%ss, retention %s days)",
        settings.poll_min_seconds,
        settings.poll_max_seconds,
        settings.offer_retention_days,
    )

    client = VintedClient(settings)
    notifier = TelegramNotifier(settings)
    await client.start()

    refresh_task = asyncio.create_task(_session_refresher(client))
    try:
        await supervisor(client, notifier)
    finally:
        refresh_task.cancel()
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())

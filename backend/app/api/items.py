from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_api_key
from app.db import get_db
from app.models import TrackedItem
from app.schemas import PaginatedItems, TrackedItemOut

router = APIRouter(prefix="/items", tags=["items"], dependencies=[Depends(require_api_key)])


@router.get("", response_model=PaginatedItems)
async def list_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    filter_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
) -> PaginatedItems:
    query = select(TrackedItem)
    count_query = select(func.count()).select_from(TrackedItem)

    if filter_id is not None:
        query = query.where(TrackedItem.filter_id == filter_id)
        count_query = count_query.where(TrackedItem.filter_id == filter_id)

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(
        query.order_by(TrackedItem.seen_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    items = list(result.scalars().all())
    return PaginatedItems(
        items=[TrackedItemOut.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )

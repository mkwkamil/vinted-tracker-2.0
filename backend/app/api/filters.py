from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_api_key
from app.db import get_db
from app.models import SearchFilter
from app.schemas import SearchFilterCreate, SearchFilterOut, SearchFilterUpdate

router = APIRouter(prefix="/filters", tags=["filters"], dependencies=[Depends(require_api_key)])


@router.get("", response_model=list[SearchFilterOut])
async def list_filters(db: AsyncSession = Depends(get_db)) -> list[SearchFilter]:
    result = await db.execute(select(SearchFilter).order_by(SearchFilter.created_at.desc()))
    return list(result.scalars().all())


@router.post("", response_model=SearchFilterOut, status_code=status.HTTP_201_CREATED)
async def create_filter(payload: SearchFilterCreate, db: AsyncSession = Depends(get_db)) -> SearchFilter:
    filt = SearchFilter(
        name=payload.name,
        catalog_url=payload.catalog_url,
        is_active=payload.is_active,
    )
    db.add(filt)
    await db.commit()
    await db.refresh(filt)
    return filt


@router.get("/{filter_id}", response_model=SearchFilterOut)
async def get_filter(filter_id: UUID, db: AsyncSession = Depends(get_db)) -> SearchFilter:
    filt = await db.get(SearchFilter, filter_id)
    if not filt:
        raise HTTPException(status_code=404, detail="Filter not found")
    return filt


@router.patch("/{filter_id}", response_model=SearchFilterOut)
async def update_filter(
    filter_id: UUID,
    payload: SearchFilterUpdate,
    db: AsyncSession = Depends(get_db),
) -> SearchFilter:
    filt = await db.get(SearchFilter, filter_id)
    if not filt:
        raise HTTPException(status_code=404, detail="Filter not found")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(filt, key, value)

    await db.commit()
    await db.refresh(filt)
    return filt


@router.delete("/{filter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_filter(filter_id: UUID, db: AsyncSession = Depends(get_db)) -> None:
    filt = await db.get(SearchFilter, filter_id)
    if not filt:
        raise HTTPException(status_code=404, detail="Filter not found")
    await db.delete(filt)
    await db.commit()

from fastapi import APIRouter

from app.api import filters, items, thrift_stores

api_router = APIRouter(prefix="/api")
api_router.include_router(filters.router)
api_router.include_router(items.router)
api_router.include_router(thrift_stores.router)


@api_router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}

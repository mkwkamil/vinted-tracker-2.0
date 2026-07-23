import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Index, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class TrackedItem(Base):
    __tablename__ = "tracked_items"
    __table_args__ = (
        Index("ix_tracked_items_seen_at", "seen_at"),
        Index("ix_tracked_items_filter_seen", "filter_id", "seen_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vinted_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False, index=True)
    filter_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("search_filters.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    brand: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    size: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="PLN", nullable=False)
    photo_url: Mapped[str] = mapped_column(Text, default="", nullable=False)
    item_url: Mapped[str] = mapped_column(Text, nullable=False)
    listed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    notified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    filter = relationship("SearchFilter", back_populates="items")

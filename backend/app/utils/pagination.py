"""
Pagination utility for list endpoints.
Provides consistent pagination with limit/offset params
and metadata in responses.
"""

from typing import Any, Generic, Sequence, TypeVar

from fastapi import Query
from pydantic import BaseModel

T = TypeVar("T")


class PaginationParams:
    """Dependency injection for pagination query parameters."""

    def __init__(
        self,
        limit: int = Query(20, ge=1, le=200, description="Number of items per page"),
        offset: int = Query(0, ge=0, description="Number of items to skip"),
    ):
        self.limit = limit
        self.offset = offset


class Page(BaseModel, Generic[T]):
    """Standard paginated response wrapper."""

    items: list[T]
    total: int
    limit: int
    offset: int
    has_more: bool = False


def paginate(
    items: Sequence[Any],
    total: int,
    params: PaginationParams,
) -> dict[str, Any]:
    """
    Wrap a query result into a paginated response dict.

    Args:
        items: The items for the current page.
        total: Total number of items across all pages.
        params: The pagination parameters used.

    Returns:
        dict with keys: data, total, limit, offset, has_more
    """
    return {
        "data": list(items),
        "total": total,
        "limit": params.limit,
        "offset": params.offset,
        "has_more": (params.offset + params.limit) < total,
    }

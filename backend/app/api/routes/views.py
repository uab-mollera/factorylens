import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_view, update_view
from app.models import (
    HierarchyLevel,
    HierarchyView,
    HierarchyViewCreate,
    HierarchyViewPublic,
    HierarchyViewsPublic,
    HierarchyViewUpdate,
    Message,
)

router = APIRouter(prefix="/views", tags=["views"])


@router.get("/", response_model=HierarchyViewsPublic)
def read_views(
    session: SessionDep,
    current_user: CurrentUser,
    level: HierarchyLevel | None = None,
    entity_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 50,
) -> Any:
    """List hierarchy views, optionally filtered by level and/or entity_id."""
    stmt = select(HierarchyView)
    count_stmt = select(func.count()).select_from(HierarchyView)
    if level:
        stmt = stmt.where(HierarchyView.level == level)
        count_stmt = count_stmt.where(HierarchyView.level == level)
    if entity_id is not None:
        stmt = stmt.where(HierarchyView.entity_id == entity_id)
        count_stmt = count_stmt.where(HierarchyView.entity_id == entity_id)
    count = session.exec(count_stmt).one()
    views = session.exec(
        stmt.order_by(HierarchyView.display_order, HierarchyView.name)
        .offset(skip)
        .limit(limit)
    ).all()
    return HierarchyViewsPublic(data=views, count=count)


@router.get("/{id}", response_model=HierarchyViewPublic)
def read_view(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    view = session.get(HierarchyView, id)
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    return view


@router.post("/", response_model=HierarchyViewPublic)
def create_view_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    view_in: HierarchyViewCreate,
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return create_view(session=session, view_in=view_in)


@router.put("/{id}", response_model=HierarchyViewPublic)
def update_view_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    view_in: HierarchyViewUpdate,
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    view = session.get(HierarchyView, id)
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    return update_view(session=session, db_view=view, view_in=view_in)


@router.delete("/{id}", response_model=Message)
def delete_view(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    view = session.get(HierarchyView, id)
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    if view.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete the default view")
    session.delete(view)
    session.commit()
    return Message(message="View deleted")

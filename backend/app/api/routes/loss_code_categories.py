import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.crud import (
    create_loss_code_category,
    delete_loss_code_category,
    update_loss_code_category,
)
from app.models import (
    LossCodeCategory,
    LossCodeCategoryCreate,
    LossCodeCategoryPublic,
    LossCodeCategoryUpdate,
    Message,
)

router = APIRouter(prefix="/loss-code-categories", tags=["loss-code-categories"])


@router.get("/", response_model=list[LossCodeCategoryPublic])
def read_loss_code_categories(
    session: SessionDep,
    current_user: CurrentUser,
    type_id: uuid.UUID | None = None,
) -> Any:
    stmt = select(LossCodeCategory).order_by(LossCodeCategory.display_order)
    if type_id is not None:
        stmt = stmt.where(LossCodeCategory.type_id == type_id)
    return list(session.exec(stmt).all())


@router.post("/", response_model=LossCodeCategoryPublic)
def create_category(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    cat_in: LossCodeCategoryCreate,
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return create_loss_code_category(session=session, cat_in=cat_in)


@router.put("/{id}", response_model=LossCodeCategoryPublic)
def update_category(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    cat_in: LossCodeCategoryUpdate,
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    cat = session.get(LossCodeCategory, id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return update_loss_code_category(session=session, db_cat=cat, cat_in=cat_in)


@router.delete("/{id}", response_model=Message)
def delete_category(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    cat = session.get(LossCodeCategory, id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    delete_loss_code_category(session=session, db_cat=cat)
    return Message(message="Category deleted")

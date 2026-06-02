import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_loss_code, get_loss_code_hierarchy, update_loss_code
from app.models import (
    LossCode,
    LossCodeCreate,
    LossCodePublic,
    LossCodesPublic,
    LossCodeTypeWithHierarchy,
    LossCodeUpdate,
    Message,
)

router = APIRouter(prefix="/loss-codes", tags=["loss-codes"])


@router.get("/hierarchy", response_model=list[LossCodeTypeWithHierarchy])
def read_loss_code_hierarchy(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    return get_loss_code_hierarchy(session=session)


@router.get("/", response_model=LossCodesPublic)
def read_loss_codes(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 200,
) -> Any:
    count = session.exec(select(func.count()).select_from(LossCode)).one()
    codes = session.exec(
        select(LossCode).order_by(LossCode.code).offset(skip).limit(limit)
    ).all()
    return LossCodesPublic(data=codes, count=count)


@router.get("/{id}", response_model=LossCodePublic)
def read_loss_code(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    code = session.get(LossCode, id)
    if not code:
        raise HTTPException(status_code=404, detail="Loss code not found")
    return code


@router.post("/", response_model=LossCodePublic)
def create_loss_code_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    code_in: LossCodeCreate,
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return create_loss_code(session=session, code_in=code_in)


@router.put("/{id}", response_model=LossCodePublic)
def update_loss_code_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    code_in: LossCodeUpdate,
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    code = session.get(LossCode, id)
    if not code:
        raise HTTPException(status_code=404, detail="Loss code not found")
    return update_loss_code(session=session, db_code=code, code_in=code_in)


@router.delete("/{id}", response_model=Message)
def delete_loss_code(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    code = session.get(LossCode, id)
    if not code:
        raise HTTPException(status_code=404, detail="Loss code not found")
    session.delete(code)
    session.commit()
    return Message(message="Loss code deleted")

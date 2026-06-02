import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_loss_entry, update_loss_entry
from app.models import (
    LossCode,
    LossCodeEntriesPublic,
    LossCodeEntry,
    LossCodeEntryCreate,
    LossCodeEntryPublic,
    LossCodeEntryUpdate,
    Machine,
    Message,
)

router = APIRouter(prefix="/loss-entries", tags=["loss-entries"])


@router.get("/", response_model=LossCodeEntriesPublic)
def read_loss_entries(
    session: SessionDep,
    current_user: CurrentUser,
    machine_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    stmt = select(LossCodeEntry)
    count_stmt = select(func.count()).select_from(LossCodeEntry)
    if machine_id:
        stmt = stmt.where(LossCodeEntry.machine_id == machine_id)
        count_stmt = count_stmt.where(LossCodeEntry.machine_id == machine_id)
    count = session.exec(count_stmt).one()
    entries = session.exec(
        stmt.order_by(LossCodeEntry.start_time.desc()).offset(skip).limit(limit)
    ).all()
    return LossCodeEntriesPublic(data=entries, count=count)


@router.get("/{id}", response_model=LossCodeEntryPublic)
def read_loss_entry(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    entry = session.get(LossCodeEntry, id)
    if not entry:
        raise HTTPException(status_code=404, detail="Loss entry not found")
    return entry


@router.post("/", response_model=LossCodeEntryPublic)
def create_loss_entry_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    entry_in: LossCodeEntryCreate,
) -> Any:
    machine = session.get(Machine, entry_in.machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    loss_code = session.get(LossCode, entry_in.loss_code_id)
    if not loss_code:
        raise HTTPException(status_code=404, detail="Loss code not found")
    return create_loss_entry(
        session=session, entry_in=entry_in, created_by=current_user.id
    )


@router.put("/{id}", response_model=LossCodeEntryPublic)
def update_loss_entry_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    entry_in: LossCodeEntryUpdate,
) -> Any:
    entry = session.get(LossCodeEntry, id)
    if not entry:
        raise HTTPException(status_code=404, detail="Loss entry not found")
    # Only the creator or a superuser may edit
    if not current_user.is_superuser and entry.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    if entry_in.loss_code_id:
        loss_code = session.get(LossCode, entry_in.loss_code_id)
        if not loss_code:
            raise HTTPException(status_code=404, detail="Loss code not found")
    return update_loss_entry(session=session, db_entry=entry, entry_in=entry_in)


@router.delete("/{id}", response_model=Message)
def delete_loss_entry(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    entry = session.get(LossCodeEntry, id)
    if not entry:
        raise HTTPException(status_code=404, detail="Loss entry not found")
    if not current_user.is_superuser and entry.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    session.delete(entry)
    session.commit()
    return Message(message="Loss entry deleted")

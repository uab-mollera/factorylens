import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import (
    create_machine,
    create_view,
    get_machine_status_timeline,
    get_oee_summary_for_machines,
    update_machine,
)
from app.models import (
    HierarchyViewCreate,
    LossCodeEntriesPublic,
    LossCodeEntry,
    Machine,
    MachineCreate,
    MachineTile,
    MachinePublic,
    MachinesPublic,
    MachineStatusesPublic,
    MachineUpdate,
    Message,
    Unit,
)

router = APIRouter(prefix="/machines", tags=["machines"])


@router.get("/", response_model=MachinesPublic)
def read_machines(
    session: SessionDep,
    current_user: CurrentUser,
    unit_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    stmt = select(Machine)
    count_stmt = select(func.count()).select_from(Machine)
    if unit_id:
        stmt = stmt.where(Machine.unit_id == unit_id)
        count_stmt = count_stmt.where(Machine.unit_id == unit_id)
    count = session.exec(count_stmt).one()
    machines = session.exec(
        stmt.order_by(Machine.display_order, Machine.name).offset(skip).limit(limit)
    ).all()
    return MachinesPublic(data=machines, count=count)


@router.get("/{id}", response_model=MachinePublic)
def read_machine(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    machine = session.get(Machine, id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine


@router.get("/{id}/status", response_model=MachineStatusesPublic)
def read_machine_status_timeline(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    from_time: datetime | None = Query(default=None),
    to_time: datetime | None = Query(default=None),
) -> Any:
    """
    Return time-series OEE status records for a machine.
    Defaults to the last 24 hours if no range supplied.
    """
    machine = session.get(Machine, id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    now = datetime.now(timezone.utc)
    if to_time is None:
        to_time = now
    if from_time is None:
        from_time = now - timedelta(hours=24)

    statuses = get_machine_status_timeline(
        session=session,
        machine_id=id,
        from_time=from_time,
        to_time=to_time,
    )
    return MachineStatusesPublic(data=statuses, count=len(statuses))


@router.get("/{id}/loss-entries", response_model=LossCodeEntriesPublic)
def read_machine_loss_entries(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    machine = session.get(Machine, id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    count_stmt = (
        select(func.count())
        .select_from(LossCodeEntry)
        .where(LossCodeEntry.machine_id == id)
    )
    count = session.exec(count_stmt).one()
    stmt = (
        select(LossCodeEntry)
        .where(LossCodeEntry.machine_id == id)
        .order_by(LossCodeEntry.start_time.desc())
        .offset(skip)
        .limit(limit)
    )
    entries = session.exec(stmt).all()
    return LossCodeEntriesPublic(data=entries, count=count)


@router.post("/", response_model=MachinePublic)
def create_machine_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    machine_in: MachineCreate,
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    unit = session.get(Unit, machine_in.unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    machine = create_machine(session=session, machine_in=machine_in)
    create_view(
        session=session,
        view_in=HierarchyViewCreate(
            name="Main",
            level="machine",
            view_type="placeholder",
            is_default=True,
            entity_id=machine.id,
            display_order=0,
        ),
    )
    return machine


@router.put("/{id}", response_model=MachinePublic)
def update_machine_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    machine_in: MachineUpdate,
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    machine = session.get(Machine, id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    if machine_in.unit_id:
        unit = session.get(Unit, machine_in.unit_id)
        if not unit:
            raise HTTPException(status_code=404, detail="Unit not found")
    return update_machine(session=session, db_machine=machine, machine_in=machine_in)


@router.delete("/{id}", response_model=Message)
def delete_machine(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    machine = session.get(Machine, id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    session.delete(machine)
    session.commit()
    return Message(message="Machine deleted")

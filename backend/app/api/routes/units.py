import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import count_active_alarms_for_machine, create_unit, create_view, get_oee_summary_for_machines, update_unit
from app.models import (
    Department,
    HierarchyViewCreate,
    Machine,
    MachineTile,
    MachinePublic,
    MachinesPublic,
    Message,
    Unit,
    UnitCreate,
    UnitPublic,
    UnitsPublic,
    UnitUpdate,
)

router = APIRouter(prefix="/units", tags=["units"])


@router.get("/", response_model=UnitsPublic)
def read_units(
    session: SessionDep,
    current_user: CurrentUser,
    department_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List all units, optionally filtered by department."""
    stmt = select(Unit)
    count_stmt = select(func.count()).select_from(Unit)
    if department_id:
        stmt = stmt.where(Unit.department_id == department_id)
        count_stmt = count_stmt.where(Unit.department_id == department_id)
    count = session.exec(count_stmt).one()
    units = session.exec(
        stmt.order_by(Unit.display_order, Unit.name).offset(skip).limit(limit)
    ).all()
    return UnitsPublic(data=units, count=count)


@router.get("/{id}", response_model=UnitPublic)
def read_unit(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    unit = session.get(Unit, id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return unit


@router.get("/{id}/machines", response_model=list[MachineTile])
def read_unit_machines_tiles(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List machines for a unit as tiles with OEE summary."""
    unit = session.get(Unit, id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    # Return units for parent department as tiles (this route gives machine tiles per unit)
    # Actually returns child units — but we expose this as machine tiles
    # Each tile = a machine under this unit
    stmt = (
        select(Machine)
        .where(Machine.unit_id == id)
        .order_by(Machine.display_order, Machine.name)
        .offset(skip)
        .limit(limit)
    )
    machines = session.exec(stmt).all()

    from app.models import MachineTile

    tiles = []
    for m in machines:
        oee = get_oee_summary_for_machines(session=session, machine_ids=[m.id])
        alarm_count = count_active_alarms_for_machine(session=session, machine_id=m.id)
        tiles.append(MachineTile(**m.model_dump(), oee=oee, active_alarm_count=alarm_count))
    return tiles


@router.post("/", response_model=UnitPublic)
def create_unit_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    unit_in: UnitCreate,
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    dept = session.get(Department, unit_in.department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    unit = create_unit(session=session, unit_in=unit_in)
    create_view(
        session=session,
        view_in=HierarchyViewCreate(
            name="Main",
            level="unit",
            view_type="tile_grid",
            is_default=True,
            entity_id=unit.id,
            display_order=0,
        ),
    )
    return unit


@router.put("/{id}", response_model=UnitPublic)
def update_unit_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    unit_in: UnitUpdate,
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    unit = session.get(Unit, id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    if unit_in.department_id:
        dept = session.get(Department, unit_in.department_id)
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
    return update_unit(session=session, db_unit=unit, unit_in=unit_in)


@router.delete("/{id}", response_model=Message)
def delete_unit(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    unit = session.get(Unit, id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    session.delete(unit)
    session.commit()
    return Message(message="Unit deleted")

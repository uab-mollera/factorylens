import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import (
    create_department,
    create_view,
    get_machine_health_counts,
    get_oee_summary_for_machines,
    update_department,
)
from app.models import (
    Department,
    DepartmentCreate,
    DepartmentPublic,
    DepartmentsPublic,
    DepartmentTile,
    DepartmentUpdate,
    HierarchyViewCreate,
    Machine,
    Message,
    Unit,
    UnitPublic,
    UnitTile,
    UnitsPublic,
)

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("/", response_model=list[DepartmentTile])
def read_departments(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List all departments with OEE tile summary."""
    stmt = (
        select(Department).order_by(Department.display_order, Department.name).offset(skip).limit(limit)
    )
    departments = session.exec(stmt).all()

    tiles: list[DepartmentTile] = []
    for dept in departments:
        # Collect all machine IDs under this department
        unit_ids_stmt = select(Unit.id).where(Unit.department_id == dept.id)
        unit_ids = list(session.exec(unit_ids_stmt).all())

        machine_ids: list[uuid.UUID] = []
        for uid in unit_ids:
            mid_stmt = select(Machine.id).where(Machine.unit_id == uid)
            machine_ids.extend(session.exec(mid_stmt).all())

        oee = get_oee_summary_for_machines(session=session, machine_ids=machine_ids)
        health = get_machine_health_counts(session=session, machine_ids=machine_ids)

        tile = DepartmentTile(
            **dept.model_dump(),
            oee=oee,
            unit_count=len(unit_ids),
            machine_count=len(machine_ids),
            running_count=health["running"],
            warning_count=health["warning"],
            stopped_count=health["stopped"],
            alarm_count=health["alarm"],
        )
        tiles.append(tile)
    return tiles


@router.get("/{id}", response_model=DepartmentPublic)
def read_department(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """Get a single department."""
    dept = session.get(Department, id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept


@router.get("/{id}/units", response_model=list[UnitTile])
def read_department_units(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List all units belonging to a department as tiles with OEE summary."""
    dept = session.get(Department, id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    stmt = (
        select(Unit)
        .where(Unit.department_id == id)
        .order_by(Unit.display_order, Unit.name)
        .offset(skip)
        .limit(limit)
    )
    units = session.exec(stmt).all()

    tiles: list[UnitTile] = []
    for unit in units:
        machine_ids_stmt = select(Machine.id).where(Machine.unit_id == unit.id)
        machine_ids = list(session.exec(machine_ids_stmt).all())
        oee = get_oee_summary_for_machines(session=session, machine_ids=machine_ids)
        health = get_machine_health_counts(session=session, machine_ids=machine_ids)
        tiles.append(UnitTile(
            **unit.model_dump(),
            oee=oee,
            machine_count=len(machine_ids),
            running_count=health["running"],
            warning_count=health["warning"],
            stopped_count=health["stopped"],
            alarm_count=health["alarm"],
        ))
    return tiles


@router.post("/", response_model=DepartmentPublic)
def create_dept(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    dept_in: DepartmentCreate,
) -> Any:
    """Create a new department. Superuser only."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    dept = create_department(session=session, dept_in=dept_in)
    create_view(
        session=session,
        view_in=HierarchyViewCreate(
            name="Main",
            level="department",
            view_type="tile_grid",
            is_default=True,
            entity_id=dept.id,
            display_order=0,
        ),
    )
    return dept


@router.put("/{id}", response_model=DepartmentPublic)
def update_dept(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    dept_in: DepartmentUpdate,
) -> Any:
    """Update a department. Superuser only."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    dept = session.get(Department, id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return update_department(session=session, db_dept=dept, dept_in=dept_in)


@router.delete("/{id}", response_model=Message)
def delete_dept(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """Delete a department (cascades to units and machines). Superuser only."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    dept = session.get(Department, id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    session.delete(dept)
    session.commit()
    return Message(message="Department deleted")

import uuid
from datetime import datetime
from typing import Any

from sqlmodel import Session, func, select

from app.core.security import get_password_hash, verify_password
from app.models import (
    Department,
    DepartmentCreate,
    DepartmentUpdate,
    HierarchyView,
    HierarchyViewCreate,
    HierarchyViewUpdate,
    Item,
    ItemCreate,
    LossCode,
    LossCodeCategory,
    LossCodeCategoryCreate,
    LossCodeCategoryUpdate,
    LossCodeCategoryInHierarchy,
    LossCodeInHierarchy,
    LossCodeType,
    LossCodeTypeWithHierarchy,
    LossCodeCreate,
    LossCodeEntry,
    LossCodeEntryCreate,
    LossCodeEntryUpdate,
    LossCodeUpdate,
    Machine,
    MachineAction,
    MachineActionCreate,
    MachineActionUpdate,
    MachineCreate,
    MachineEvent,
    MachineEventCreate,
    MachineEventUpdate,
    MachineNote,
    MachineNoteCreate,
    MachineNoteUpdate,
    EventType,
    EventStatus,
    MachineStatus,
    MachineUpdate,
    Unit,
    UnitCreate,
    UnitUpdate,
    User,
    UserCreate,
    UserUpdate,
)


def create_user(*, session: Session, user_create: UserCreate) -> User:
    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    session_user = session.exec(statement).first()
    return session_user


# Dummy hash to use for timing attack prevention when user is not found
# This is an Argon2 hash of a random password, used to ensure constant-time comparison
DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$MjQyZWE1MzBjYjJlZTI0Yw$YTU4NGM5ZTZmYjE2NzZlZjY0ZWY3ZGRkY2U2OWFjNjk"


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    if not db_user:
        # Prevent timing attacks by running password verification even when user doesn't exist
        # This ensures the response time is similar whether or not the email exists
        verify_password(password, DUMMY_HASH)
        return None
    verified, updated_password_hash = verify_password(password, db_user.hashed_password)
    if not verified:
        return None
    if updated_password_hash:
        db_user.hashed_password = updated_password_hash
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
    return db_user


def create_item(*, session: Session, item_in: ItemCreate, owner_id: uuid.UUID) -> Item:
    db_item = Item.model_validate(item_in, update={"owner_id": owner_id})
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item


# ---------------------------------------------------------------------------
# Department CRUD
# ---------------------------------------------------------------------------


def create_department(*, session: Session, dept_in: DepartmentCreate) -> Department:
    dept = Department.model_validate(dept_in)
    session.add(dept)
    session.commit()
    session.refresh(dept)
    return dept


def update_department(
    *, session: Session, db_dept: Department, dept_in: DepartmentUpdate
) -> Department:
    dept_data = dept_in.model_dump(exclude_unset=True)
    db_dept.sqlmodel_update(dept_data)
    session.add(db_dept)
    session.commit()
    session.refresh(db_dept)
    return db_dept


# ---------------------------------------------------------------------------
# Unit CRUD
# ---------------------------------------------------------------------------


def create_unit(*, session: Session, unit_in: UnitCreate) -> Unit:
    unit = Unit.model_validate(unit_in)
    session.add(unit)
    session.commit()
    session.refresh(unit)
    return unit


def update_unit(*, session: Session, db_unit: Unit, unit_in: UnitUpdate) -> Unit:
    unit_data = unit_in.model_dump(exclude_unset=True)
    db_unit.sqlmodel_update(unit_data)
    session.add(db_unit)
    session.commit()
    session.refresh(db_unit)
    return db_unit


# ---------------------------------------------------------------------------
# Machine CRUD
# ---------------------------------------------------------------------------


def create_machine(*, session: Session, machine_in: MachineCreate) -> Machine:
    machine = Machine.model_validate(machine_in)
    session.add(machine)
    session.commit()
    session.refresh(machine)
    return machine


def update_machine(
    *, session: Session, db_machine: Machine, machine_in: MachineUpdate
) -> Machine:
    machine_data = machine_in.model_dump(exclude_unset=True)
    db_machine.sqlmodel_update(machine_data)
    session.add(db_machine)
    session.commit()
    session.refresh(db_machine)
    return db_machine


# ---------------------------------------------------------------------------
# HierarchyView CRUD
# ---------------------------------------------------------------------------


def create_view(*, session: Session, view_in: HierarchyViewCreate) -> HierarchyView:
    view = HierarchyView.model_validate(view_in)
    session.add(view)
    session.commit()
    session.refresh(view)
    return view


def update_view(
    *, session: Session, db_view: HierarchyView, view_in: HierarchyViewUpdate
) -> HierarchyView:
    view_data = view_in.model_dump(exclude_unset=True)
    db_view.sqlmodel_update(view_data)
    session.add(db_view)
    session.commit()
    session.refresh(db_view)
    return db_view


# ---------------------------------------------------------------------------
# LossCode CRUD
# ---------------------------------------------------------------------------


def create_loss_code(*, session: Session, code_in: LossCodeCreate) -> LossCode:
    code = LossCode.model_validate(code_in)
    session.add(code)
    session.commit()
    session.refresh(code)
    return code


def update_loss_code(
    *, session: Session, db_code: LossCode, code_in: LossCodeUpdate
) -> LossCode:
    code_data = code_in.model_dump(exclude_unset=True)
    db_code.sqlmodel_update(code_data)
    session.add(db_code)
    session.commit()
    session.refresh(db_code)
    return db_code


# ---------------------------------------------------------------------------
# LossCodeEntry CRUD
# ---------------------------------------------------------------------------


def create_loss_entry(
    *, session: Session, entry_in: LossCodeEntryCreate, created_by: uuid.UUID
) -> LossCodeEntry:
    entry = LossCodeEntry.model_validate(entry_in, update={"created_by": created_by})
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def update_loss_entry(
    *,
    session: Session,
    db_entry: LossCodeEntry,
    entry_in: LossCodeEntryUpdate,
) -> LossCodeEntry:
    entry_data = entry_in.model_dump(exclude_unset=True)
    db_entry.sqlmodel_update(entry_data)
    session.add(db_entry)
    session.commit()
    session.refresh(db_entry)
    return db_entry


# ---------------------------------------------------------------------------
# OEE helpers
# ---------------------------------------------------------------------------


def _oee_status(value: float) -> Any:
    from app.models import OEEStatus  # local import to avoid circular at module level

    if value >= 85.0:
        return OEEStatus.GREEN
    if value >= 60.0:
        return OEEStatus.YELLOW
    return OEEStatus.RED


def get_machine_latest_oee(
    *, session: Session, machine_id: uuid.UUID
) -> "MachineStatus | None":
    from app.models import MachineStatus

    stmt = (
        select(MachineStatus)
        .where(MachineStatus.machine_id == machine_id)
        .order_by(MachineStatus.timestamp.desc())
        .limit(1)
    )
    return session.exec(stmt).first()


def get_oee_summary_for_machines(
    *, session: Session, machine_ids: list[uuid.UUID]
) -> "Any":
    from app.models import MachineStatus, OEESummary

    if not machine_ids:
        return None

    # Get the latest status row per machine, then average the values
    availabilities: list[float] = []
    performances: list[float] = []
    qualities: list[float] = []

    for mid in machine_ids:
        latest = get_machine_latest_oee(session=session, machine_id=mid)
        if latest:
            availabilities.append(latest.availability)
            performances.append(latest.performance)
            qualities.append(latest.quality)

    if not availabilities:
        return None

    avg_a = sum(availabilities) / len(availabilities)
    avg_p = sum(performances) / len(performances)
    avg_q = sum(qualities) / len(qualities)

    return OEESummary(
        availability=round(avg_a, 1),
        performance=round(avg_p, 1),
        quality=round(avg_q, 1),
        availability_status=_oee_status(avg_a),
        performance_status=_oee_status(avg_p),
        quality_status=_oee_status(avg_q),
    )


def get_machine_health_counts(
    *, session: Session, machine_ids: list[uuid.UUID]
) -> dict[str, int]:
    """Return running/warning/stopped/alarm counts for a set of machines."""
    from app.models import OEEStatus

    running = 0
    warning = 0
    stopped = 0
    alarm = 0
    for mid in machine_ids:
        latest = get_machine_latest_oee(session=session, machine_id=mid)
        if latest:
            if latest.status == OEEStatus.GREEN:
                running += 1
            elif latest.status == OEEStatus.YELLOW:
                warning += 1
            else:
                stopped += 1
        alarm_cnt = count_active_alarms_for_machine(session=session, machine_id=mid)
        if alarm_cnt > 0:
            alarm += 1
    return {"running": running, "warning": warning, "stopped": stopped, "alarm": alarm}


def get_machine_status_timeline(
    *,
    session: Session,
    machine_id: uuid.UUID,
    from_time: datetime,
    to_time: datetime,
) -> list["MachineStatus"]:
    from app.models import MachineStatus

    stmt = (
        select(MachineStatus)
        .where(MachineStatus.machine_id == machine_id)
        .where(MachineStatus.timestamp >= from_time)
        .where(MachineStatus.timestamp <= to_time)
        .order_by(MachineStatus.timestamp.asc())
    )
    return list(session.exec(stmt).all())


# ---------------------------------------------------------------------------
# LossCodeType / Category / Hierarchy
# ---------------------------------------------------------------------------


def list_loss_code_types(*, session: Session) -> list[LossCodeType]:
    return list(session.exec(select(LossCodeType).order_by(LossCodeType.display_order)).all())


def create_loss_code_category(
    *, session: Session, cat_in: LossCodeCategoryCreate
) -> LossCodeCategory:
    cat = LossCodeCategory.model_validate(cat_in)
    session.add(cat)
    session.commit()
    session.refresh(cat)
    return cat


def update_loss_code_category(
    *, session: Session, db_cat: LossCodeCategory, cat_in: LossCodeCategoryUpdate
) -> LossCodeCategory:
    cat_data = cat_in.model_dump(exclude_unset=True)
    db_cat.sqlmodel_update(cat_data)
    session.add(db_cat)
    session.commit()
    session.refresh(db_cat)
    return db_cat


def delete_loss_code_category(*, session: Session, db_cat: LossCodeCategory) -> None:
    session.delete(db_cat)
    session.commit()


def get_loss_code_hierarchy(*, session: Session) -> list[LossCodeTypeWithHierarchy]:
    types = list(
        session.exec(select(LossCodeType).order_by(LossCodeType.display_order)).all()
    )
    result: list[LossCodeTypeWithHierarchy] = []
    for t in types:
        cats = list(
            session.exec(
                select(LossCodeCategory)
                .where(LossCodeCategory.type_id == t.id)
                .order_by(LossCodeCategory.display_order)
            ).all()
        )
        cat_list: list[LossCodeCategoryInHierarchy] = []
        for c in cats:
            codes = list(
                session.exec(
                    select(LossCode)
                    .where(LossCode.category_id == c.id)
                    .order_by(LossCode.code)
                ).all()
            )
            cat_list.append(
                LossCodeCategoryInHierarchy(
                    id=c.id,
                    type_id=c.type_id,
                    name=c.name,
                    display_order=c.display_order,
                    loss_codes=[
                        LossCodeInHierarchy(id=lc.id, code=lc.code, name=lc.name)
                        for lc in codes
                    ],
                )
            )
        result.append(
            LossCodeTypeWithHierarchy(
                id=t.id,
                key=t.key,
                label=t.label,
                color=t.color,
                display_order=t.display_order,
                categories=cat_list,
            )
        )
    return result


# ---------------------------------------------------------------------------
# MachineNote CRUD
# ---------------------------------------------------------------------------


def create_machine_note(
    *, session: Session, note_in: MachineNoteCreate, created_by: uuid.UUID
) -> MachineNote:
    note = MachineNote.model_validate(note_in, update={"created_by": created_by})
    session.add(note)
    session.commit()
    session.refresh(note)
    return note


def update_machine_note(
    *, session: Session, db_note: MachineNote, note_in: MachineNoteUpdate
) -> MachineNote:
    note_data = note_in.model_dump(exclude_unset=True)
    db_note.sqlmodel_update(note_data)
    session.add(db_note)
    session.commit()
    session.refresh(db_note)
    return db_note


def delete_machine_note(*, session: Session, db_note: MachineNote) -> None:
    session.delete(db_note)
    session.commit()


def list_machine_notes(
    *, session: Session, machine_id: uuid.UUID
) -> list[MachineNote]:
    stmt = (
        select(MachineNote)
        .where(MachineNote.machine_id == machine_id)
        .order_by(MachineNote.created_at.desc())
    )
    return list(session.exec(stmt).all())


# ---------------------------------------------------------------------------
# MachineAction CRUD
# ---------------------------------------------------------------------------


def create_machine_action(
    *, session: Session, action_in: MachineActionCreate, created_by: uuid.UUID
) -> MachineAction:
    action = MachineAction.model_validate(action_in, update={"created_by": created_by})
    session.add(action)
    session.commit()
    session.refresh(action)
    return action


def update_machine_action(
    *, session: Session, db_action: MachineAction, action_in: MachineActionUpdate
) -> MachineAction:
    action_data = action_in.model_dump(exclude_unset=True)
    db_action.sqlmodel_update(action_data)
    session.add(db_action)
    session.commit()
    session.refresh(db_action)
    return db_action


def delete_machine_action(*, session: Session, db_action: MachineAction) -> None:
    session.delete(db_action)
    session.commit()


def list_machine_actions(
    *, session: Session, machine_id: uuid.UUID
) -> list[MachineAction]:
    stmt = (
        select(MachineAction)
        .where(MachineAction.machine_id == machine_id)
        .order_by(MachineAction.created_at.desc())
    )
    return list(session.exec(stmt).all())


def create_machine_event(
    *, session: Session, event_in: MachineEventCreate, created_by: uuid.UUID
) -> MachineEvent:
    event = MachineEvent.model_validate(event_in, update={"created_by": created_by})
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def update_machine_event(
    *, session: Session, db_event: MachineEvent, event_in: MachineEventUpdate
) -> MachineEvent:
    event_data = event_in.model_dump(exclude_unset=True)
    db_event.sqlmodel_update(event_data)
    session.add(db_event)
    session.commit()
    session.refresh(db_event)
    return db_event


def delete_machine_event(*, session: Session, db_event: MachineEvent) -> None:
    session.delete(db_event)
    session.commit()


def list_machine_events(
    *,
    session: Session,
    machine_id: uuid.UUID,
    event_type: EventType | None = None,
    status: EventStatus | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[MachineEvent]:
    stmt = select(MachineEvent).where(MachineEvent.machine_id == machine_id)
    if event_type is not None:
        stmt = stmt.where(MachineEvent.event_type == event_type)
    if status is not None:
        stmt = stmt.where(MachineEvent.status == status)
    stmt = stmt.order_by(MachineEvent.timestamp.desc()).offset(skip).limit(limit)
    return list(session.exec(stmt).all())


def count_active_alarms_for_machine(
    *, session: Session, machine_id: uuid.UUID
) -> int:
    stmt = (
        select(func.count())
        .select_from(MachineEvent)
        .where(
            MachineEvent.machine_id == machine_id,
            MachineEvent.event_type == EventType.ALARM,
            MachineEvent.status.in_(
                [EventStatus.ACTIVE, EventStatus.ACKNOWLEDGED]
            ),
        )
    )
    result = session.exec(stmt).one()
    return result if result is not None else 0


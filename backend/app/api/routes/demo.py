import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import SQLModel, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    LossCode,
    LossCodeCategory,
    LossCodeEntry,
    LossCodeType,
    Machine,
    MachineStatus,
    Message,
    OEEStatus,
)

router = APIRouter(prefix="/demo", tags=["demo"])


class DemoSeedRequest(SQLModel):
    machine_id: uuid.UUID
    from_time: datetime
    to_time: datetime


@router.post("/seed", response_model=Message)
def seed_demo_data(
    body: DemoSeedRequest,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Seed demo OEE status and loss entry records for a machine (superuser only)."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser required")

    machine = session.get(Machine, body.machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    from_dt = body.from_time
    to_dt = body.to_time
    if from_dt.tzinfo is None:
        from_dt = from_dt.replace(tzinfo=timezone.utc)
    if to_dt.tzinfo is None:
        to_dt = to_dt.replace(tzinfo=timezone.utc)

    def find_first_lc(type_key: str) -> LossCode | None:
        lct = session.exec(
            select(LossCodeType).where(LossCodeType.key == type_key)
        ).first()
        if not lct:
            return None
        cat = session.exec(
            select(LossCodeCategory).where(LossCodeCategory.type_id == lct.id)
        ).first()
        if not cat:
            return None
        return session.exec(
            select(LossCode).where(LossCode.category_id == cat.id)
        ).first()

    shut_lc = find_first_lc("shut")
    slow_lc = find_first_lc("slow_production")

    total_minutes = int((to_dt - from_dt).total_seconds() / 60)

    # Segment pattern: (offset_minutes, status, loss_code)
    # Designed for a 24-hour production shift (06:00 - 06:00)
    SEGMENTS = [
        (0,   OEEStatus.RED,    shut_lc),    # 06:00 - startup
        (20,  OEEStatus.GREEN,  None),        # 06:20 - running
        (120, OEEStatus.YELLOW, slow_lc),    # 08:00 - slow production
        (140, OEEStatus.GREEN,  None),        # 08:20 - running
        (240, OEEStatus.RED,    shut_lc),    # 10:00 - breakdown
        (285, OEEStatus.GREEN,  None),        # 10:45 - running
        (360, OEEStatus.RED,    shut_lc),    # 12:00 - lunch stop
        (390, OEEStatus.GREEN,  None),        # 12:30 - running
        (510, OEEStatus.YELLOW, slow_lc),    # 14:30 - slow production
        (540, OEEStatus.GREEN,  None),        # 15:00 - running
        (660, OEEStatus.RED,    shut_lc),    # 17:00 - planned maintenance
        (690, OEEStatus.GREEN,  None),        # 17:30 - running
        (780, OEEStatus.RED,    shut_lc),    # 19:00 - end of production
    ]

    created_status = 0
    created_entries = 0

    for i, (offset_min, status_val, lc) in enumerate(SEGMENTS):
        if offset_min >= total_minutes:
            break

        ts = from_dt + timedelta(minutes=offset_min)

        if status_val == OEEStatus.GREEN:
            avail, perf, qual = 97.0, 89.0, 99.2
        elif status_val == OEEStatus.YELLOW:
            avail, perf, qual = 100.0, 62.0, 97.5
        else:  # RED
            avail, perf, qual = 0.0, 0.0, 100.0

        ms_rec = MachineStatus(
            machine_id=body.machine_id,
            timestamp=ts,
            status=status_val,
            availability=avail,
            performance=perf,
            quality=qual,
            raw_data={"demo": True},
        )
        session.add(ms_rec)
        created_status += 1

        if lc and status_val != OEEStatus.GREEN:
            next_offset = SEGMENTS[i + 1][0] if i + 1 < len(SEGMENTS) else total_minutes
            end_ts = from_dt + timedelta(minutes=next_offset)
            if end_ts > to_dt:
                end_ts = to_dt
            le = LossCodeEntry(
                machine_id=body.machine_id,
                loss_code_id=lc.id,
                start_time=ts,
                end_time=end_ts,
                notes="__demo__",
                created_by=current_user.id,
            )
            session.add(le)
            created_entries += 1

    session.commit()
    return Message(
        message=f"Seeded {created_status} status records and {created_entries} loss entries"
    )


@router.delete("/clear", response_model=Message)
def clear_demo_data(
    machine_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Remove all demo-tagged OEE and loss entry records for a machine (superuser only)."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser required")

    entries = session.exec(
        select(LossCodeEntry)
        .where(LossCodeEntry.machine_id == machine_id)
        .where(LossCodeEntry.notes == "__demo__")
    ).all()
    for e in entries:
        session.delete(e)

    statuses = session.exec(
        select(MachineStatus).where(MachineStatus.machine_id == machine_id)
    ).all()
    demo_statuses = [s for s in statuses if s.raw_data and s.raw_data.get("demo")]
    for s in demo_statuses:
        session.delete(s)

    session.commit()
    return Message(
        message=f"Cleared {len(demo_statuses)} status records and {len(entries)} loss entries"
    )

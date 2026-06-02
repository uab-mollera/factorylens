import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import CurrentUser, SessionDep
from app.crud import (
    count_active_alarms_for_machine,
    create_machine_event,
    delete_machine_event,
    list_machine_events,
    update_machine_event,
)
from app.models import (
    EventStatus,
    EventType,
    MachineEvent,
    MachineEventCreate,
    MachineEventPublic,
    MachineEventsPublic,
    MachineEventUpdate,
    Message,
)

router = APIRouter(prefix="/machine-events", tags=["machine-events"])


@router.get("/", response_model=MachineEventsPublic)
def list_events(
    session: SessionDep,
    current_user: CurrentUser,
    machine_id: uuid.UUID,
    event_type: EventType | None = Query(default=None),
    status: EventStatus | None = Query(default=None),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    events = list_machine_events(
        session=session,
        machine_id=machine_id,
        event_type=event_type,
        status=status,
        skip=skip,
        limit=limit,
    )
    return MachineEventsPublic(data=events, count=len(events))


@router.post("/", response_model=MachineEventPublic)
def create_event(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    event_in: MachineEventCreate,
) -> Any:
    return create_machine_event(
        session=session, event_in=event_in, created_by=current_user.id
    )


@router.put("/{id}", response_model=MachineEventPublic)
def update_event(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    event_in: MachineEventUpdate,
) -> Any:
    event = session.get(MachineEvent, id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return update_machine_event(session=session, db_event=event, event_in=event_in)


@router.delete("/{id}", response_model=Message)
def delete_event(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    event = session.get(MachineEvent, id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    delete_machine_event(session=session, db_event=event)
    return Message(message="Event deleted")

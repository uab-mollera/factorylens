import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, SessionDep
from app.crud import (
    create_machine_action,
    delete_machine_action,
    list_machine_actions,
    update_machine_action,
)
from app.models import (
    MachineAction,
    MachineActionCreate,
    MachineActionPublic,
    MachineActionsPublic,
    MachineActionUpdate,
    Message,
)

router = APIRouter(prefix="/machine-actions", tags=["machine-actions"])


@router.get("/", response_model=MachineActionsPublic)
def read_machine_actions(
    session: SessionDep,
    current_user: CurrentUser,
    machine_id: uuid.UUID,
) -> Any:
    actions = list_machine_actions(session=session, machine_id=machine_id)
    return MachineActionsPublic(data=actions, count=len(actions))


@router.post("/", response_model=MachineActionPublic)
def create_action(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    action_in: MachineActionCreate,
) -> Any:
    return create_machine_action(
        session=session, action_in=action_in, created_by=current_user.id
    )


@router.patch("/{id}", response_model=MachineActionPublic)
def update_action(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    action_in: MachineActionUpdate,
) -> Any:
    action = session.get(MachineAction, id)
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    return update_machine_action(session=session, db_action=action, action_in=action_in)


@router.delete("/{id}", response_model=Message)
def delete_action(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    action = session.get(MachineAction, id)
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    delete_machine_action(session=session, db_action=action)
    return Message(message="Action deleted")

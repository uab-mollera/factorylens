import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, SessionDep
from app.crud import (
    create_machine_note,
    delete_machine_note,
    list_machine_notes,
    update_machine_note,
)
from app.models import (
    MachineNote,
    MachineNoteCreate,
    MachineNotePublic,
    MachineNotesPublic,
    MachineNoteUpdate,
    Message,
)

router = APIRouter(prefix="/machine-notes", tags=["machine-notes"])


@router.get("/", response_model=MachineNotesPublic)
def read_machine_notes(
    session: SessionDep,
    current_user: CurrentUser,
    machine_id: uuid.UUID,
) -> Any:
    notes = list_machine_notes(session=session, machine_id=machine_id)
    return MachineNotesPublic(data=notes, count=len(notes))


@router.post("/", response_model=MachineNotePublic)
def create_note(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    note_in: MachineNoteCreate,
) -> Any:
    return create_machine_note(
        session=session, note_in=note_in, created_by=current_user.id
    )


@router.put("/{id}", response_model=MachineNotePublic)
def update_note(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    note_in: MachineNoteUpdate,
) -> Any:
    note = session.get(MachineNote, id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return update_machine_note(session=session, db_note=note, note_in=note_in)


@router.delete("/{id}", response_model=Message)
def delete_note(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    note = session.get(MachineNote, id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    delete_machine_note(session=session, db_note=note)
    return Message(message="Note deleted")

from typing import Any

from fastapi import APIRouter

from app.api.deps import CurrentUser, SessionDep
from app.crud import list_loss_code_types
from app.models import LossCodeTypePublic

router = APIRouter(prefix="/loss-code-types", tags=["loss-code-types"])


@router.get("/", response_model=list[LossCodeTypePublic])
def read_loss_code_types(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    return list_loss_code_types(session=session)

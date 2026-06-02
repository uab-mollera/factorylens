from fastapi import APIRouter

from app.api.routes import (
    demo,
    departments,
    items,
    login,
    loss_code_categories,
    loss_code_types,
    loss_codes,
    loss_entries,
    machine_actions,
    machine_events,
    machine_notes,
    machines,
    private,
    units,
    users,
    utils,
    views,
)
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(departments.router)
api_router.include_router(units.router)
api_router.include_router(machines.router)
api_router.include_router(loss_code_types.router)
api_router.include_router(loss_code_categories.router)
api_router.include_router(loss_codes.router)
api_router.include_router(loss_entries.router)
api_router.include_router(machine_notes.router)
api_router.include_router(machine_actions.router)
api_router.include_router(machine_events.router)
api_router.include_router(demo.router)
api_router.include_router(views.router)


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)

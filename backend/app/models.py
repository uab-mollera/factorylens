import enum
import uuid
from datetime import datetime, timezone
from typing import Any

from pydantic import EmailStr
from sqlalchemy import Column, DateTime, JSON
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class OEEStatus(str, enum.Enum):
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"


class LossType(str, enum.Enum):
    SHUT = "shut"
    SLOW_PRODUCTION = "slow_production"
    NORMAL_PRODUCTION = "normal_production"


class NoteShift(str, enum.Enum):
    MORNING = "morning"
    AFTERNOON = "afternoon"
    NIGHT = "night"


class NoteCriticality(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ActionStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    CLOSED = "closed"


class EventType(str, enum.Enum):
    OPERATOR_NOTE = "operator_note"
    ALARM = "alarm"
    WARNING = "warning"
    MAINTENANCE = "maintenance"
    QUALITY = "quality"
    PRODUCTION = "production"
    ORDER_CHANGE = "order_change"
    SYSTEM = "system"
    ALARM_CLEARED = "alarm_cleared"


class EventSeverity(str, enum.Enum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EventSource(str, enum.Enum):
    OPERATOR = "operator"
    SYSTEM = "system"
    INTEGRATION = "integration"


class EventStatus(str, enum.Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    CLEARED = "cleared"


class HierarchyLevel(str, enum.Enum):
    HOME = "home"
    DEPARTMENT = "department"
    UNIT = "unit"
    MACHINE = "machine"


# ---------------------------------------------------------------------------
# Department
# ---------------------------------------------------------------------------


class DepartmentBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    display_order: int = Field(default=0)


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    display_order: int | None = None


class Department(DepartmentBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    units: list["Unit"] = Relationship(back_populates="department", cascade_delete=True)


class DepartmentPublic(DepartmentBase):
    id: uuid.UUID


class OEESummary(SQLModel):
    availability: float | None = None
    performance: float | None = None
    quality: float | None = None
    availability_status: OEEStatus | None = None
    performance_status: OEEStatus | None = None
    quality_status: OEEStatus | None = None


class DepartmentTile(DepartmentPublic):
    oee: OEESummary | None = None
    unit_count: int = 0
    machine_count: int = 0
    running_count: int = 0
    warning_count: int = 0
    stopped_count: int = 0
    alarm_count: int = 0


class DepartmentsPublic(SQLModel):
    data: list[DepartmentPublic]
    count: int


# ---------------------------------------------------------------------------
# Unit
# ---------------------------------------------------------------------------


class UnitBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    display_order: int = Field(default=0)


class UnitCreate(UnitBase):
    department_id: uuid.UUID


class UnitUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    display_order: int | None = None
    department_id: uuid.UUID | None = None


class Unit(UnitBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    department_id: uuid.UUID = Field(
        foreign_key="department.id", nullable=False, ondelete="CASCADE"
    )
    department: Department | None = Relationship(back_populates="units")
    machines: list["Machine"] = Relationship(back_populates="unit", cascade_delete=True)


class UnitPublic(UnitBase):
    id: uuid.UUID
    department_id: uuid.UUID


class UnitTile(UnitPublic):
    oee: OEESummary | None = None
    machine_count: int = 0
    running_count: int = 0
    warning_count: int = 0
    stopped_count: int = 0
    alarm_count: int = 0


class UnitsPublic(SQLModel):
    data: list[UnitPublic]
    count: int


# ---------------------------------------------------------------------------
# Machine
# ---------------------------------------------------------------------------


class MachineBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    kep_tag_prefix: str | None = Field(default=None, max_length=255)
    display_order: int = Field(default=0)
    machine_type: str | None = Field(default=None, max_length=100)


class MachineCreate(MachineBase):
    unit_id: uuid.UUID


class MachineUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    kep_tag_prefix: str | None = Field(default=None, max_length=255)
    display_order: int | None = None
    unit_id: uuid.UUID | None = None
    machine_type: str | None = Field(default=None, max_length=100)


class Machine(MachineBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    unit_id: uuid.UUID = Field(
        foreign_key="unit.id", nullable=False, ondelete="CASCADE"
    )
    unit: Unit | None = Relationship(back_populates="machines")
    statuses: list["MachineStatus"] = Relationship(
        back_populates="machine", cascade_delete=True
    )
    loss_entries: list["LossCodeEntry"] = Relationship(
        back_populates="machine", cascade_delete=True
    )
    notes: list["MachineNote"] = Relationship(
        back_populates="machine", cascade_delete=True
    )
    actions: list["MachineAction"] = Relationship(
        back_populates="machine", cascade_delete=True
    )
    events: list["MachineEvent"] = Relationship(
        back_populates="machine", cascade_delete=True
    )


class MachinePublic(MachineBase):
    id: uuid.UUID
    unit_id: uuid.UUID


class MachineTile(MachinePublic):
    oee: OEESummary | None = None
    active_alarm_count: int = 0


class MachinesPublic(SQLModel):
    data: list[MachinePublic]
    count: int


# ---------------------------------------------------------------------------
# HierarchyView
# ---------------------------------------------------------------------------


class HierarchyViewBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    level: HierarchyLevel
    view_type: str = Field(default="placeholder", max_length=100)
    display_order: int = Field(default=0)
    is_default: bool = Field(default=False)
    entity_id: uuid.UUID | None = Field(default=None, index=True)


class HierarchyViewCreate(HierarchyViewBase):
    pass


class HierarchyViewUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    view_type: str | None = Field(default=None, max_length=100)
    display_order: int | None = None
    is_default: bool | None = None


class HierarchyView(HierarchyViewBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)


class HierarchyViewPublic(HierarchyViewBase):
    id: uuid.UUID


class HierarchyViewsPublic(SQLModel):
    data: list[HierarchyViewPublic]
    count: int


# ---------------------------------------------------------------------------
# LossCodeType  (fixed: shut / slow_production / normal_production)
# ---------------------------------------------------------------------------


class LossCodeTypeBase(SQLModel):
    key: str = Field(min_length=1, max_length=50)
    label: str = Field(min_length=1, max_length=100)
    color: str = Field(default="#6B7280", max_length=20)
    display_order: int = Field(default=0)


class LossCodeType(LossCodeTypeBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    categories: list["LossCodeCategory"] = Relationship(
        back_populates="loss_code_type", cascade_delete=True
    )


class LossCodeTypePublic(LossCodeTypeBase):
    id: uuid.UUID


# ---------------------------------------------------------------------------
# LossCodeCategory
# ---------------------------------------------------------------------------


class LossCodeCategoryBase(SQLModel):
    name: str = Field(min_length=1, max_length=100)
    display_order: int = Field(default=0)


class LossCodeCategoryCreate(LossCodeCategoryBase):
    type_id: uuid.UUID


class LossCodeCategoryUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    display_order: int | None = None


class LossCodeCategory(LossCodeCategoryBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    type_id: uuid.UUID = Field(
        foreign_key="losscodetype.id", nullable=False, ondelete="CASCADE"
    )
    loss_code_type: LossCodeType | None = Relationship(back_populates="categories")
    loss_codes: list["LossCode"] = Relationship(
        back_populates="category", cascade_delete=False
    )


class LossCodeCategoryPublic(LossCodeCategoryBase):
    id: uuid.UUID
    type_id: uuid.UUID


# ---------------------------------------------------------------------------
# LossCode
# ---------------------------------------------------------------------------


class LossCodeBase(SQLModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=255)
    category_id: uuid.UUID = Field(foreign_key="losscodecategory.id")


class LossCodeCreate(LossCodeBase):
    pass


class LossCodeUpdate(SQLModel):
    code: str | None = Field(default=None, min_length=1, max_length=50)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    category_id: uuid.UUID | None = None


class LossCode(LossCodeBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    category: LossCodeCategory | None = Relationship(back_populates="loss_codes")
    loss_entries: list["LossCodeEntry"] = Relationship(back_populates="loss_code")


class LossCodePublic(SQLModel):
    id: uuid.UUID
    code: str
    name: str
    category_id: uuid.UUID


class LossCodesPublic(SQLModel):
    data: list[LossCodePublic]
    count: int


# Hierarchy response models
class LossCodeInHierarchy(SQLModel):
    id: uuid.UUID
    code: str
    name: str


class LossCodeCategoryInHierarchy(LossCodeCategoryBase):
    id: uuid.UUID
    type_id: uuid.UUID
    loss_codes: list[LossCodeInHierarchy] = []


class LossCodeTypeWithHierarchy(LossCodeTypeBase):
    id: uuid.UUID
    categories: list[LossCodeCategoryInHierarchy] = []


# ---------------------------------------------------------------------------
# MachineStatus  (time-series, written by Airflow from KepServer)
# ---------------------------------------------------------------------------


class MachineStatusBase(SQLModel):
    timestamp: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    status: OEEStatus
    availability: float = Field(ge=0.0, le=100.0)
    performance: float = Field(ge=0.0, le=100.0)
    quality: float = Field(ge=0.0, le=100.0)
    raw_data: Any | None = Field(default=None, sa_column=Column(JSON))


class MachineStatus(MachineStatusBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    machine_id: uuid.UUID = Field(
        foreign_key="machine.id", nullable=False, ondelete="CASCADE"
    )
    machine: Machine | None = Relationship(back_populates="statuses")


class MachineStatusPublic(MachineStatusBase):
    id: uuid.UUID
    machine_id: uuid.UUID


class MachineStatusesPublic(SQLModel):
    data: list[MachineStatusPublic]
    count: int


# ---------------------------------------------------------------------------
# LossCodeEntry
# ---------------------------------------------------------------------------


class LossCodeEntryBase(SQLModel):
    start_time: datetime = Field(sa_type=DateTime(timezone=True))  # type: ignore
    end_time: datetime | None = Field(
        default=None, sa_type=DateTime(timezone=True)  # type: ignore
    )
    notes: str | None = Field(default=None, max_length=1000)


class LossCodeEntryCreate(LossCodeEntryBase):
    machine_id: uuid.UUID
    loss_code_id: uuid.UUID


class LossCodeEntryUpdate(SQLModel):
    start_time: datetime | None = None
    end_time: datetime | None = None
    notes: str | None = None
    loss_code_id: uuid.UUID | None = None


class LossCodeEntry(LossCodeEntryBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    machine_id: uuid.UUID = Field(
        foreign_key="machine.id", nullable=False, ondelete="CASCADE"
    )
    loss_code_id: uuid.UUID = Field(
        foreign_key="losscode.id", nullable=False, ondelete="RESTRICT"
    )
    created_by: uuid.UUID | None = Field(
        default=None, foreign_key="user.id", nullable=True, ondelete="SET NULL"
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    machine: Machine | None = Relationship(back_populates="loss_entries")
    loss_code: LossCode | None = Relationship(back_populates="loss_entries")


class LossCodeEntryPublic(LossCodeEntryBase):
    id: uuid.UUID
    machine_id: uuid.UUID
    loss_code_id: uuid.UUID
    created_by: uuid.UUID | None = None
    created_at: datetime


class LossCodeEntriesPublic(SQLModel):
    data: list[LossCodeEntryPublic]
    count: int


# ---------------------------------------------------------------------------
# MachineNote
# ---------------------------------------------------------------------------


class MachineNoteBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1, max_length=5000)
    shift: NoteShift
    impact: str | None = Field(default=None, max_length=500)
    criticality: NoteCriticality = Field(default=NoteCriticality.LOW)


class MachineNoteCreate(MachineNoteBase):
    machine_id: uuid.UUID


class MachineNoteUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    content: str | None = Field(default=None, min_length=1, max_length=5000)
    shift: NoteShift | None = None
    impact: str | None = None
    criticality: NoteCriticality | None = None


class MachineNote(MachineNoteBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    machine_id: uuid.UUID = Field(
        foreign_key="machine.id", nullable=False, ondelete="CASCADE"
    )
    created_by: uuid.UUID | None = Field(
        default=None, foreign_key="user.id", nullable=True, ondelete="SET NULL"
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    machine: Machine | None = Relationship(back_populates="notes")


class MachineNotePublic(MachineNoteBase):
    id: uuid.UUID
    machine_id: uuid.UUID
    created_by: uuid.UUID | None = None
    created_at: datetime


class MachineNotesPublic(SQLModel):
    data: list[MachineNotePublic]
    count: int


# ---------------------------------------------------------------------------
# MachineAction
# ---------------------------------------------------------------------------


class MachineActionBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    status: ActionStatus = Field(default=ActionStatus.OPEN)
    owner: str = Field(min_length=1, max_length=255)


class MachineActionCreate(MachineActionBase):
    machine_id: uuid.UUID


class MachineActionUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    status: ActionStatus | None = None
    owner: str | None = Field(default=None, min_length=1, max_length=255)


class MachineAction(MachineActionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    machine_id: uuid.UUID = Field(
        foreign_key="machine.id", nullable=False, ondelete="CASCADE"
    )
    created_by: uuid.UUID | None = Field(
        default=None, foreign_key="user.id", nullable=True, ondelete="SET NULL"
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    machine: Machine | None = Relationship(back_populates="actions")


class MachineActionPublic(MachineActionBase):
    id: uuid.UUID
    machine_id: uuid.UUID
    created_by: uuid.UUID | None = None
    created_at: datetime


class MachineActionsPublic(SQLModel):
    data: list[MachineActionPublic]
    count: int


# ---------------------------------------------------------------------------
# MachineEvent
# ---------------------------------------------------------------------------


class MachineEventBase(SQLModel):
    event_type: EventType = Field(default=EventType.OPERATOR_NOTE)
    severity: EventSeverity = Field(default=EventSeverity.INFO)
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    source: EventSource = Field(default=EventSource.OPERATOR)
    status: EventStatus = Field(default=EventStatus.ACTIVE)
    timestamp: datetime = Field(default_factory=get_datetime_utc)


class MachineEventCreate(MachineEventBase):
    machine_id: uuid.UUID
    related_action_id: uuid.UUID | None = None


class MachineEventUpdate(SQLModel):
    event_type: EventType | None = None
    severity: EventSeverity | None = None
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    source: EventSource | None = None
    status: EventStatus | None = None
    related_action_id: uuid.UUID | None = None


class MachineEvent(MachineEventBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    machine_id: uuid.UUID = Field(
        foreign_key="machine.id", nullable=False, ondelete="CASCADE"
    )
    created_by: uuid.UUID | None = Field(
        default=None, foreign_key="user.id", nullable=True, ondelete="SET NULL"
    )
    related_action_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="machineaction.id",
        nullable=True,
        ondelete="SET NULL",
    )
    timestamp: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    machine: Machine | None = Relationship(back_populates="events")


class MachineEventPublic(MachineEventBase):
    id: uuid.UUID
    machine_id: uuid.UUID
    created_by: uuid.UUID | None = None
    related_action_id: uuid.UUID | None = None


class MachineEventsPublic(SQLModel):
    data: list[MachineEventPublic]
    count: int

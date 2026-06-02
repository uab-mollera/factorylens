"""One-shot script: backfill a default 'Main' tile_grid view for every entity
that was created before the auto-view-seeding code was added."""
import uuid
from sqlmodel import Session, select
from app.core.db import engine
from app.models import HierarchyView, Department, Unit, Machine


def backfill_views() -> None:
    with Session(engine) as s:
        created = 0

        # Home
        if not s.exec(select(HierarchyView).where(HierarchyView.level == "home")).first():
            s.add(HierarchyView(
                id=uuid.uuid4(), name="Main", level="home",
                view_type="tile_grid", is_default=True,
                entity_id=None, display_order=0,
            ))
            created += 1
            print("Created home Main view")

        # Departments
        for dept in s.exec(select(Department)).all():
            has_default = s.exec(
                select(HierarchyView)
                .where(HierarchyView.level == "department")
                .where(HierarchyView.entity_id == dept.id)
                .where(HierarchyView.is_default == True)  # noqa: E712
            ).first()
            if not has_default:
                s.add(HierarchyView(
                    id=uuid.uuid4(), name="Main", level="department",
                    view_type="tile_grid", is_default=True,
                    entity_id=dept.id, display_order=0,
                ))
                created += 1
                print(f"Created department Main view for '{dept.name}'")

        # Units
        for unit in s.exec(select(Unit)).all():
            has_default = s.exec(
                select(HierarchyView)
                .where(HierarchyView.level == "unit")
                .where(HierarchyView.entity_id == unit.id)
                .where(HierarchyView.is_default == True)  # noqa: E712
            ).first()
            if not has_default:
                s.add(HierarchyView(
                    id=uuid.uuid4(), name="Main", level="unit",
                    view_type="tile_grid", is_default=True,
                    entity_id=unit.id, display_order=0,
                ))
                created += 1
                print(f"Created unit Main view for '{unit.name}'")

        # Machines
        for machine in s.exec(select(Machine)).all():
            has_default = s.exec(
                select(HierarchyView)
                .where(HierarchyView.level == "machine")
                .where(HierarchyView.entity_id == machine.id)
                .where(HierarchyView.is_default == True)  # noqa: E712
            ).first()
            if not has_default:
                s.add(HierarchyView(
                    id=uuid.uuid4(), name="Main", level="machine",
                    view_type="tile_grid", is_default=True,
                    entity_id=machine.id, display_order=0,
                ))
                created += 1
                print(f"Created machine Main view for '{machine.name}'")

        s.commit()
        print(f"\nDone — {created} view(s) created.")


if __name__ == "__main__":
    backfill_views()

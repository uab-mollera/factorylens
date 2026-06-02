import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"

import { DepartmentsService, UnitsService } from "@/client"
import type { HierarchyLevel } from "@/client"
import { HierarchyTile } from "@/components/hierarchy/HierarchyTile"
import { TileGrid } from "@/components/hierarchy/TileGrid"
import { MosaicBoardTemplate } from "@/components/hierarchy/MosaicBoardTemplate"
import { MachineTileCard } from "@/components/machine/MachineTileCard"

// ── Template props ──────────────────────────────────────────────────────────

export interface ViewTemplateProps {
  /** ID of the current entity (departmentId, unitId, machineId, or "" for home) */
  entityId: string
  /** Current hierarchy level */
  level: HierarchyLevel
  /** Parent entity ID — required when level="unit" so navigation can supply departmentId */
  parentId?: string
  /** ID of the active view — used for view-scoped persistence (e.g. mosaic layout) */
  viewId?: string
}

// ── Template metadata (used in AddViewModal select list) ────────────────────

export interface TemplateInfo {
  label: string
  description: string
}

export const TEMPLATE_REGISTRY: Record<string, TemplateInfo> = {
  tile_grid: {
    label: "Tile Grid",
    description: "Grid of child entities with OEE indicators",
  },
  mosaic_board: {
    label: "Mosaic Board",
    description: "Draggable iframe panel layout",
  },
  placeholder: {
    label: "Placeholder",
    description: "Empty view — add content later",
  },
}

// ── Helper ──────────────────────────────────────────────────────────────────

export function renderViewTemplate(
  viewType: string,
  props: ViewTemplateProps,
): React.ReactNode {
  switch (viewType) {
    case "tile_grid":
      return <TileGridTemplate {...props} />
    case "mosaic_board":
      return <MosaicBoardTemplate viewId={props.viewId ?? ""} />
    default:
      return <PlaceholderTemplate />
  }
}

// ── Tile Grid Template ───────────────────────────────────────────────────────

function TileGridTemplate({ entityId, level, parentId }: ViewTemplateProps) {
  const navigate = useNavigate()

  const deptsQuery = useQuery({
    queryKey: ["departments"],
    queryFn: () => DepartmentsService.readDepartments(),
    enabled: level === "home",
  })

  const unitsQuery = useQuery({
    queryKey: ["department-units", entityId],
    queryFn: () => DepartmentsService.readDepartmentUnits({ id: entityId }),
    enabled: level === "department",
  })

  const machinesQuery = useQuery({
    queryKey: ["unit-machines", entityId],
    queryFn: () => UnitsService.readUnitMachinesTiles({ id: entityId }),
    enabled: level === "unit",
  })

  if (level === "home") {
    const depts = deptsQuery.data ?? []
    if (deptsQuery.isLoading) return <Loading message="Loading departments…" />
    if (depts.length === 0) return <Empty message="No departments configured yet." />
    return (
      <TileGrid>
        {depts.map((dept) => (
          <HierarchyTile
            key={dept.id}
            name={dept.name}
            assetSummary={
              dept.unit_count != null && dept.machine_count != null
                ? `${dept.unit_count} Unit${dept.unit_count !== 1 ? "s" : ""} • ${dept.machine_count} Machine${dept.machine_count !== 1 ? "s" : ""}`
                : undefined
            }
            oee={dept.oee}
            runningCount={dept.running_count ?? 0}
            warningCount={dept.warning_count ?? 0}
            stoppedCount={dept.stopped_count ?? 0}
            alarmCount={dept.alarm_count ?? 0}
            onClick={() =>
              navigate({ to: "/departments/$departmentId", params: { departmentId: dept.id } })
            }
          />
        ))}
      </TileGrid>
    )
  }

  if (level === "department") {
    const units = unitsQuery.data ?? []
    if (unitsQuery.isLoading) return <Loading message="Loading units…" />
    if (units.length === 0) return <Empty message="No units configured yet." />
    return (
      <TileGrid>
        {units.map((unit) => (
          <HierarchyTile
            key={unit.id}
            name={unit.name}
            assetSummary={
              unit.machine_count != null
                ? `${unit.machine_count} Machine${unit.machine_count !== 1 ? "s" : ""}`
                : undefined
            }
            oee={unit.oee}
            runningCount={unit.running_count ?? 0}
            warningCount={unit.warning_count ?? 0}
            stoppedCount={unit.stopped_count ?? 0}
            alarmCount={unit.alarm_count ?? 0}
            onClick={() =>
              navigate({
                to: "/departments/$departmentId/units/$unitId",
                params: { departmentId: entityId, unitId: unit.id },
              })
            }
          />
        ))}
      </TileGrid>
    )
  }

  if (level === "unit") {
    const machines = machinesQuery.data ?? []
    if (machinesQuery.isLoading) return <Loading message="Loading machines…" />
    if (machines.length === 0) return <Empty message="No machines configured yet." />
    return (
      <TileGrid className="grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
        {machines.map((machine) => (
          <MachineTileCard
            key={machine.id}
            machine={machine}
            onClick={() =>
              navigate({
                to: "/departments/$departmentId/units/$unitId/machines/$machineId",
                params: {
                  departmentId: parentId ?? "",
                  unitId: entityId,
                  machineId: machine.id,
                },
              })
            }
          />
        ))}
      </TileGrid>
    )
  }

  return <Empty message="Tile grid not available at this level." />
}

// ── Placeholder Template ─────────────────────────────────────────────────────

function PlaceholderTemplate() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      This view has no content yet.
    </div>
  )
}

// ── Shared helpers ───────────────────────────────────────────────────────────

function Loading({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      {message}
    </div>
  )
}

function Empty({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      {message}
    </div>
  )
}

import { AlertTriangle, CheckCircle2, Circle, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { OEESummary } from "@/client"

interface HierarchyTileProps {
  name: string
  /** e.g. "2 Units • 8 Machines" or "3 Machines" */
  assetSummary?: string
  oee?: OEESummary | null
  /** Machines currently running (green status) */
  runningCount?: number
  /** Machines with warnings (yellow status) */
  warningCount?: number
  /** Machines stopped (red status) */
  stoppedCount?: number
  /** Machines with at least one active alarm */
  alarmCount?: number
  onClick?: () => void
  className?: string
}

// OEE overall = A * P * Q / 10000
function calcOee(oee: OEESummary | null | undefined): number | null {
  if (!oee || oee.availability == null || oee.performance == null || oee.quality == null) return null
  return Math.round((oee.availability * oee.performance * oee.quality) / 10000)
}

function oeeBarColor(pct: number): string {
  if (pct > 85) return "bg-green-500"
  if (pct >= 70) return "bg-amber-400"
  return "bg-red-500"
}

function oeeTextColor(pct: number): string {
  if (pct > 85) return "text-green-600 dark:text-green-400"
  if (pct >= 70) return "text-amber-600 dark:text-amber-400"
  return "text-red-600 dark:text-red-400"
}

export function HierarchyTile({
  name,
  assetSummary,
  oee,
  runningCount = 0,
  warningCount = 0,
  stoppedCount = 0,
  alarmCount = 0,
  onClick,
  className,
}: HierarchyTileProps) {
  const oeePct = calcOee(oee)
  const hasStatusData = runningCount + warningCount + stoppedCount > 0
  const hasAlarms = alarmCount > 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col gap-3 rounded-xl border bg-card p-4 text-left w-full",
        "shadow-sm transition-all duration-150",
        "hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "active:translate-y-0 active:shadow-sm",
        className,
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-card-foreground leading-tight line-clamp-2">
          {name}
        </span>
        {assetSummary && (
          <span className="text-xs text-muted-foreground">{assetSummary}</span>
        )}
      </div>

      {/* OEE bar */}
      {oeePct !== null ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">OEE</span>
            <span className={cn("text-base font-bold tabular-nums leading-none", oeeTextColor(oeePct))}>
              {oeePct}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-300", oeeBarColor(oeePct))}
              style={{ width: `${oeePct}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">OEE</span>
            <span className="text-sm text-muted-foreground/60">—</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted" />
        </div>
      )}

      {/* Status counts */}
      {hasStatusData && (
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {runningCount}
          </span>
          <span className="flex items-center gap-1 text-amber-500 font-medium">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {warningCount}
          </span>
          <span className="flex items-center gap-1 text-red-500 font-medium">
            <Minus className="h-3.5 w-3.5 shrink-0" />
            {stoppedCount}
          </span>
        </div>
      )}

      {/* Alarm banner — only when alarms exist */}
      {hasAlarms && (
        <div className="flex items-center gap-1.5 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 px-2 py-1 text-xs text-red-700 dark:text-red-300 font-medium">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {alarmCount === 1 ? "1 Active Alarm" : `${alarmCount} Active Alarms`}
        </div>
      )}

      {/* No data placeholder — keeps card consistent height when no machines */}
      {!hasStatusData && oeePct === null && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <Circle className="h-3 w-3 shrink-0" />
          No data yet
        </div>
      )}
    </button>
  )
}

import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MachineTile } from "@/client"

const MACHINE_IMAGES: Record<string, string> = {
  Såg: "/assets/images/machines/såg_icon.svg",
  Ugn: "/assets/images/machines/varmebehandlingsugn_icon.svg",
  Fräs: "/assets/images/machines/frasmaskin_icon.svg",
}

function getOeeBarColor(pct: number): string {
  if (pct > 85) return "#22c55e"
  if (pct >= 70) return "#f59e0b"
  return "#ef4444"
}

function getOeeTextClass(pct: number): string {
  if (pct > 85) return "text-green-500"
  if (pct >= 70) return "text-amber-500"
  return "text-red-500"
}

function fmt(v: number | null | undefined): string {
  return v != null ? `${Math.round(v)}%` : "—"
}

interface MachineTileCardProps {
  machine: MachineTile
  onClick?: () => void
}

export function MachineTileCard({ machine, onClick }: MachineTileCardProps) {
  const imageUrl = machine.machine_type
    ? MACHINE_IMAGES[machine.machine_type]
    : undefined

  const avail = machine.oee?.availability
  const perf = machine.oee?.performance
  const qual = machine.oee?.quality

  const oeeOverall =
    avail != null && perf != null && qual != null
      ? Math.round((avail * perf * qual) / 10000)
      : null

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col rounded-xl border bg-card text-left w-full",
        "shadow-sm transition-all duration-150",
        "hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "active:translate-y-0 active:shadow-sm",
      )}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          {machine.machine_type && (
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
              {machine.machine_type}
            </p>
          )}
          <h3 className="text-sm font-bold text-card-foreground leading-snug line-clamp-2">
            {machine.name}
          </h3>
          {machine.description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {machine.description}
            </p>
          )}
        </div>
        {imageUrl && (
          <img
            src={imageUrl}
            alt={machine.machine_type ?? "machine"}
            className="w-12 h-12 object-contain shrink-0 opacity-85"
          />
        )}
      </div>

      {/* ── OEE ────────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <div className="flex items-baseline gap-1.5 mb-1.5">
          <span
            className={cn(
              "text-3xl font-bold tabular-nums leading-none",
              oeeOverall != null ? getOeeTextClass(oeeOverall) : "text-muted-foreground",
            )}
          >
            {oeeOverall != null ? `${oeeOverall}%` : "—"}
          </span>
          <span className="text-xs text-muted-foreground font-medium">OEE</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          {oeeOverall != null && (
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${oeeOverall}%`,
                backgroundColor: getOeeBarColor(oeeOverall),
              }}
            />
          )}
        </div>

        {/* A / P / Q */}
        <div className="mt-2 flex items-center gap-3 text-[11px]">
          <span className="text-muted-foreground">
            A <span className="font-semibold text-foreground">{fmt(avail)}</span>
          </span>
          <span className="text-muted-foreground">
            P <span className="font-semibold text-foreground">{fmt(perf)}</span>
          </span>
          <span className="text-muted-foreground">
            Q <span className="font-semibold text-foreground">{fmt(qual)}</span>
          </span>
        </div>
      </div>

      {/* ── Production info ─────────────────────────────────── */}
      <div className="border-t px-4 py-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Order</span>
          <span className="font-medium text-muted-foreground/60">—</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Target</span>
          <span className="font-medium text-muted-foreground/60">—</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Actual</span>
          <span className="font-medium text-muted-foreground/60">—</span>
        </div>
      </div>

      {/* ── Alert area ──────────────────────────────────────── */}
      <div className="border-t px-4 py-2.5">
        {(machine.active_alarm_count ?? 0) === 0 ? (
          <div className="flex items-center gap-1.5 text-[11px] text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>No active alarms</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-red-600 dark:text-red-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="font-semibold">
              {machine.active_alarm_count} active alarm{machine.active_alarm_count === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>
    </button>
  )
}

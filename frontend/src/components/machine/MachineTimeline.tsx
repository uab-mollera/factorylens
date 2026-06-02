import { useEffect, useState } from "react"
import type { MachineStatusPublic } from "@/client"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { format } from "@/utils"

const STATUS_BG: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
}

const STATUS_LABEL: Record<string, string> = {
  green: "Normal Production",
  yellow: "Slow Production",
  red: "Shut",
}

interface MachineTimelineProps {
  statuses: MachineStatusPublic[]
  fromTime: Date
  toTime: Date
  onBlockClick?: (status: MachineStatusPublic) => void
}

export function MachineTimeline({
  statuses,
  fromTime,
  toTime,
  onBlockClick,
}: MachineTimelineProps) {
  const totalMs = toTime.getTime() - fromTime.getTime()

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const nowPct =
    ((now.getTime() - fromTime.getTime()) / totalMs) * 100

  if (totalMs <= 0) return null

  // Build contiguous blocks; each status record represents state FROM its timestamp
  // until the next record's timestamp (or toTime for the last record).
  const blocks: Array<{
    status: MachineStatusPublic
    startPct: number
    widthPct: number
    startLabel: string
    endLabel: string
  }> = []

  for (let i = 0; i < statuses.length; i++) {
    const ts = statuses[i].timestamp ?? new Date(fromTime).toISOString()
    const start = new Date(ts).getTime()
    const nextTs = statuses[i + 1]?.timestamp
    const end =
      i + 1 < statuses.length && nextTs
        ? new Date(nextTs).getTime()
        : toTime.getTime()

    const clampedStart = Math.max(start, fromTime.getTime())
    const clampedEnd = Math.min(end, toTime.getTime())
    if (clampedEnd <= clampedStart) continue

    const startPct = ((clampedStart - fromTime.getTime()) / totalMs) * 100
    const widthPct = ((clampedEnd - clampedStart) / totalMs) * 100

    blocks.push({
      status: statuses[i],
      startPct,
      widthPct,
      startLabel: format.time(new Date(clampedStart)),
      endLabel: format.time(new Date(clampedEnd)),
    })
  }

  // Hour-tick markers
  const tickMs = 3600_000
  const ticks: { pct: number; label: string }[] = []
  const firstTick = Math.ceil(fromTime.getTime() / tickMs) * tickMs
  for (let t = firstTick; t <= toTime.getTime(); t += tickMs) {
    ticks.push({
      pct: ((t - fromTime.getTime()) / totalMs) * 100,
      label: format.time(new Date(t)),
    })
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3 select-none">
      {/* Timeline bar */}
      <div className="relative h-10 w-full rounded-md bg-muted overflow-hidden">
        {/* Filled gap at start if no data begins at fromTime */}
        {statuses.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            No data for selected range
          </div>
        )}
        {blocks.map((b, i) => (
          <Tooltip key={i} delayDuration={100}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onBlockClick?.(b.status)}
                className={`absolute top-0 h-full ${STATUS_BG[b.status.status]} opacity-90 hover:opacity-100 hover:brightness-110 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`}
                style={{ left: `${b.startPct}%`, width: `${b.widthPct}%` }}
                aria-label={`${STATUS_LABEL[b.status.status]} from ${b.startLabel} to ${b.endLabel}`}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-medium">{STATUS_LABEL[b.status.status]}</p>
              <p className="text-muted-foreground">
                {b.startLabel} → {b.endLabel}
              </p>
              <p>A: {b.status.availability.toFixed(1)}% | P: {b.status.performance.toFixed(1)}% | Q: {b.status.quality.toFixed(1)}%</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {/* Current-time indicator */}
        {nowPct >= 0 && nowPct <= 100 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-blue-500 z-10 pointer-events-none"
            style={{ left: `${nowPct}%` }}
            title={`Now: ${format.time(now)}`}
          />
        )}
      </div>

      {/* Hour ticks */}
      <div className="relative h-4 w-full">
        {ticks.map((t) => (
          <span
            key={t.pct}
            className="absolute -translate-x-1/2 text-[10px] text-muted-foreground"
            style={{ left: `${t.pct}%` }}
          >
            {t.label}
          </span>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${STATUS_BG[k]}`} />
            {v}
          </span>
        ))}
      </div>
    </div>
  )
}

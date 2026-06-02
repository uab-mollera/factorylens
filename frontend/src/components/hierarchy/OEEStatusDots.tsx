import type { OEEStatus } from "@/client"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface OEEStatusDotsProps {
  availability?: OEEStatus | null
  performance?: OEEStatus | null
  quality?: OEEStatus | null
  /** Show label tooltips on hover */
  showLabels?: boolean
}

const STATUS_COLOR: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
}

const TOOLTIPS = ["Availability", "Performance", "Quality"]

export function OEEStatusDots({
  availability,
  performance,
  quality,
  showLabels = true,
}: OEEStatusDotsProps) {
  const statuses = [availability, performance, quality]

  return (
    <div className="flex items-center gap-1.5">
      {statuses.map((status, i) => {
        const colorClass = status ? STATUS_COLOR[status] : "bg-muted-foreground/30"
        const dot = (
          <span
            key={i}
            className={`inline-block h-3.5 w-3.5 rounded-full shrink-0 ${colorClass}`}
            aria-label={`${TOOLTIPS[i]}: ${status ?? "unknown"}`}
          />
        )
        if (!showLabels) return dot
        return (
          <Tooltip key={i} delayDuration={300}>
            <TooltipTrigger asChild>{dot}</TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">
                {TOOLTIPS[i]}: <span className="font-medium capitalize">{status ?? "—"}</span>
              </p>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

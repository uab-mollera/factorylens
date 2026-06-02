import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MachineEventsService } from "@/client"
import type { EventSeverity, MachineEventPublic } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"

const SEVERITY_LABELS: Record<EventSeverity, string> = {
  info: "Info",
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
}

const SEVERITY_BADGE_COLORS: Record<EventSeverity, string> = {
  info: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  low: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
}

interface Props {
  machineId: string
}

export function ActiveAlarmsCard({ machineId }: Props) {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["machine-events", machineId, "alarm"],
    queryFn: () =>
      MachineEventsService.listEvents({
        machineId,
        eventType: "alarm",
        limit: 50,
      }),
  })

  const activeAlarms: MachineEventPublic[] = (data?.data ?? []).filter(
    (e) => e.status === "active" || e.status === "acknowledged",
  )

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) =>
      MachineEventsService.updateEvent({
        id,
        requestBody: { status: "acknowledged" },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine-events", machineId] })
      queryClient.invalidateQueries({ queryKey: ["unit-machines"] })
      showSuccessToast("Alarm acknowledged")
    },
    onError: () => showErrorToast("Failed to acknowledge alarm"),
  })

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="px-5 py-3.5 border-b">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Active Alarms
        </h2>
      </div>

      <div className="p-4">
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-4">Loading…</p>
        ) : activeAlarms.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="text-sm">No active alarms</span>
          </div>
        ) : (
          <ul className="space-y-2">
            {activeAlarms.map((alarm) => (
              <li
                key={alarm.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 px-3 py-2.5"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span
                    className={`mt-0.5 inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${SEVERITY_BADGE_COLORS[alarm.severity ?? "info"]}`}
                  >
                    {SEVERITY_LABELS[alarm.severity ?? "info"]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {alarm.title}
                    </p>
                    {alarm.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {alarm.description}
                      </p>
                    )}
                  </div>
                </div>
                {alarm.status === "active" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 h-7 text-[11px] px-2"
                    disabled={acknowledgeMutation.isPending}
                    onClick={() => acknowledgeMutation.mutate(alarm.id)}
                  >
                    Acknowledge
                  </Button>
                )}
                {alarm.status === "acknowledged" && (
                  <span className="shrink-0 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    Acknowledged
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

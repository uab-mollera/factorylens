import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"

import { DemoService, MachinesService, ViewsService } from "@/client"
import type { MachineStatusPublic } from "@/client"
import { ViewTabBar } from "@/components/hierarchy/ViewTabBar"
import { AddViewModal } from "@/components/hierarchy/AddViewModal"
import { DeleteViewDialog } from "@/components/hierarchy/DeleteViewDialog"
import { MachineTimeline } from "@/components/machine/MachineTimeline"
import { LossCodeEntryModal } from "@/components/machine/LossCodeEntryModal"
import { MachineEventsSection } from "@/components/machine/MachineEventsSection"
import { ActiveAlarmsCard } from "@/components/machine/ActiveAlarmsCard"
import { MachineActionsSection } from "@/components/machine/MachineActionsSection"
import { SpeedGauge } from "@/components/machine/SpeedGauge"
import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute(
  "/_layout/departments/$departmentId/units/$unitId/machines/$machineId",
)({
  component: MachinePage,
  head: () => ({
    meta: [{ title: "FactoryLens - Machine" }],
  }),
})

function getDefaultShiftDate(): Date {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (now.getHours() < 6) d.setDate(d.getDate() - 1)
  return d
}

function dateToInputStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-")
}

function inputStrToDate(s: string): Date {
  const [y, m, day] = s.split("-").map(Number)
  return new Date(y, m - 1, day)
}

function MachinePage() {
  const { machineId } = Route.useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [selectedDate, setSelectedDate] = useState<Date>(getDefaultShiftDate)

  const fromTime = useMemo(() => {
    const d = new Date(selectedDate)
    d.setHours(6, 0, 0, 0)
    return d
  }, [selectedDate])

  const toTime = useMemo(() => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    d.setHours(6, 0, 0, 0)
    return d
  }, [selectedDate])

  const [activeViewId, setActiveViewId] = useState<string | undefined>()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [deleteViewId, setDeleteViewId] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ViewsService.deleteView({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["views", "machine", machineId] })
      if (activeViewId === deleteViewId) setActiveViewId(undefined)
      setDeleteViewId(null)
      toast.success("View deleted")
    },
  })

  const [lossModalOpen, setLossModalOpen] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState<MachineStatusPublic | undefined>()

  const [simRunning, setSimRunning] = useState(false)
  const [simSpeed, setSimSpeed] = useState(85)

  useEffect(() => {
    if (!simRunning) return
    const id = setInterval(() => {
      setSimSpeed((prev) => {
        const delta = (Math.random() - 0.4) * 10
        return Math.min(100, Math.max(20, Math.round(prev + delta)))
      })
    }, 1800)
    return () => clearInterval(id)
  }, [simRunning])

  const { data: machine } = useQuery({
    queryKey: ["machine", machineId],
    queryFn: () => MachinesService.readMachine({ id: machineId }),
  })

  const { data: viewsData } = useQuery({
    queryKey: ["views", "machine", machineId],
    queryFn: () => ViewsService.readViews({ level: "machine", entityId: machineId, limit: 50 }),
  })

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ["machine-timeline", machineId, fromTime.toISOString(), toTime.toISOString()],
    queryFn: () =>
      MachinesService.readMachineStatusTimeline({
        id: machineId,
        fromTime: fromTime.toISOString(),
        toTime: toTime.toISOString(),
      }),
  })

  const { data: lossEntriesData } = useQuery({
    queryKey: ["machine-loss-entries", machineId],
    queryFn: () => MachinesService.readMachineLossEntries({ id: machineId }),
  })

  const seedMutation = useMutation({
    mutationFn: () =>
      DemoService.seedDemoData({
        requestBody: {
          machine_id: machineId,
          from_time: fromTime.toISOString(),
          to_time: toTime.toISOString(),
        },
      }),
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ["machine-timeline", machineId] })
      queryClient.invalidateQueries({ queryKey: ["machine-loss-entries", machineId] })
    },
    onError: () => toast.error("Failed to seed demo data"),
  })

  const clearMutation = useMutation({
    mutationFn: () => DemoService.clearDemoData({ machineId }),
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ["machine-timeline", machineId] })
      queryClient.invalidateQueries({ queryKey: ["machine-loss-entries", machineId] })
    },
    onError: () => toast.error("Failed to clear demo data"),
  })

  const views = viewsData?.data ?? []
  void lossEntriesData

  useEffect(() => {
    if (activeViewId === undefined && views.length > 0) {
      const initial = views.find((v) => v.is_default) ?? views[0]
      setActiveViewId(initial.id)
    }
  }, [activeViewId, views])

  const activeView =
    views.find((v) => v.id === activeViewId) ??
    views.find((v) => v.is_default) ??
    views[0]

  const statuses = timelineData?.data ?? []
  const latestPerf = statuses.length > 0 ? statuses[statuses.length - 1].performance : null
  const displaySpeed = simRunning ? simSpeed : (latestPerf ?? 0)

  function handleBlockClick(status: MachineStatusPublic) {
    if (status.status === "red" || status.status === "yellow") {
      setSelectedBlock(status)
      setLossModalOpen(true)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <ViewTabBar
        views={views}
        activeViewId={activeView?.id}
        onViewChange={setActiveViewId}
        canAdd={user?.is_superuser}
        canDelete={user?.is_superuser}
        onAddView={() => setAddModalOpen(true)}
        onDeleteView={setDeleteViewId}
      />

      <div className="flex-1 overflow-auto p-4 space-y-6">
        <div>
          <h2 className="text-xl font-semibold">{machine?.name ?? "Machine"}</h2>
          {machine?.description && (
            <p className="text-sm text-muted-foreground">{machine.description}</p>
          )}
        </div>

        {/* Timeline + Speed gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border bg-card p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                OEE Timeline
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Shift:</span>
                  <input
                    type="date"
                    value={dateToInputStr(selectedDate)}
                    max={dateToInputStr(getDefaultShiftDate())}
                    onChange={(e) => {
                      if (e.target.value) setSelectedDate(inputStrToDate(e.target.value))
                    }}
                    className="border rounded-md px-2 py-1 text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                {user?.is_superuser && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950 text-xs h-7"
                      onClick={() => seedMutation.mutate()}
                      disabled={seedMutation.isPending}
                    >
                      Seed Demo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => clearMutation.mutate()}
                      disabled={clearMutation.isPending}
                    >
                      Clear Demo
                    </Button>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => setLossModalOpen(true)}>
                  Log Loss
                </Button>
              </div>
            </div>

            {timelineLoading ? (
              <div className="h-12 flex items-center justify-center text-muted-foreground text-sm">
                Loading timeline…
              </div>
            ) : (
              <MachineTimeline
                statuses={statuses}
                fromTime={fromTime}
                toTime={toTime}
                onBlockClick={handleBlockClick}
              />
            )}
          </div>

          {/* Speed Gauge */}
          <div className="rounded-xl border bg-card p-4 flex flex-col items-center justify-between gap-3">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide self-start">
              Live Speed
            </h3>
            <SpeedGauge
              value={displaySpeed}
              target={100}
              label="Performance"
              unit="%"
            />
            <div className="flex gap-2 w-full">
              {simRunning ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setSimRunning(false)}
                >
                  ■ Stop Simulation
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                  onClick={() => {
                    setSimSpeed(latestPerf ?? 85)
                    setSimRunning(true)
                  }}
                >
                  ▶ Simulate Live
                </Button>
              )}
            </div>
            {simRunning && (
              <p className="text-[10px] text-muted-foreground text-center leading-tight">
                Simulating live speed · updates every ~2 s
              </p>
            )}
          </div>
        </div>

        {/* Active Alarms + Follow-up Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActiveAlarmsCard machineId={machineId} />
          <div className="rounded-xl border bg-card p-4">
            <MachineActionsSection machineId={machineId} />
          </div>
        </div>

        {/* Machine Events */}
        <MachineEventsSection machineId={machineId} />
      </div>

      <LossCodeEntryModal
        open={lossModalOpen}
        onOpenChange={setLossModalOpen}
        machineId={machineId}
        machineName={machine?.name ?? "Machine"}
        prefillBlock={selectedBlock}
      />
      <AddViewModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        level="machine"
        entityId={machineId}
      />
      <DeleteViewDialog
        viewId={deleteViewId}
        viewName={views.find((v) => v.id === deleteViewId)?.name ?? ""}
        onConfirm={() => deleteViewId && deleteMutation.mutate(deleteViewId)}
        onCancel={() => setDeleteViewId(null)}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}

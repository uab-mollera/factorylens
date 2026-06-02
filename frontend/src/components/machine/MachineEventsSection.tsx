import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MachineEventsService } from "@/client"
import type { EventSeverity, EventType, EventStatus, MachineEventPublic } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  operator_note: "Note",
  alarm: "Alarm",
  warning: "Warning",
  maintenance: "Maintenance",
  quality: "Quality",
  production: "Production",
  order_change: "Order Change",
  system: "System",
  alarm_cleared: "Alarm Cleared",
}

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  operator_note: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  alarm: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  maintenance: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  quality: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  production: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  order_change: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  system: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  alarm_cleared: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
}

const SEVERITY_LABELS: Record<EventSeverity, string> = {
  info: "Info",
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
}

const SEVERITY_COLORS: Record<EventSeverity, string> = {
  info: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  low: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
}

const STATUS_LABELS: Record<EventStatus, string> = {
  active: "Active",
  acknowledged: "Acknowledged",
  cleared: "Cleared",
}

const STATUS_COLORS: Record<EventStatus, string> = {
  active: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300",
  acknowledged: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300",
  cleared: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300",
}

const SOURCE_LABELS: Record<string, string> = {
  operator: "Operator",
  system: "System",
  integration: "Integration",
}

type FilterTab = "all" | EventType

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "alarm", label: "Alarms" },
  { id: "operator_note", label: "Notes" },
  { id: "warning", label: "Warnings" },
  { id: "maintenance", label: "Maintenance" },
  { id: "quality", label: "Quality" },
  { id: "production", label: "Production" },
]

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
})
type CreateForm = z.infer<typeof createSchema>

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${className}`}>
      {children}
    </span>
  )
}

interface Props {
  machineId: string
}

export function MachineEventsSection({ machineId }: Props) {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all")
  const [addOpen, setAddOpen] = useState(false)

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: "", description: "", severity: "info" },
  })

  const { data, isLoading } = useQuery({
    queryKey: ["machine-events", machineId, activeFilter],
    queryFn: () =>
      MachineEventsService.listEvents({
        machineId,
        eventType: activeFilter === "all" ? undefined : (activeFilter as EventType),
        limit: 100,
      }),
  })

  const createMutation = useMutation({
    mutationFn: (values: CreateForm) =>
      MachineEventsService.createEvent({
        requestBody: {
          machine_id: machineId,
          event_type: "operator_note",
          source: "operator",
          status: "active",
          title: values.title,
          description: values.description || undefined,
          severity: values.severity,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine-events", machineId] })
      showSuccessToast("Event added")
      setAddOpen(false)
      form.reset()
    },
    onError: () => showErrorToast("Failed to add event"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => MachineEventsService.deleteEvent({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine-events", machineId] })
      showSuccessToast("Event deleted")
    },
    onError: () => showErrorToast("Failed to delete event"),
  })

  const events: MachineEventPublic[] = data?.data ?? []

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b">
        <h2 className="text-sm font-semibold">Machine Events</h2>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Note
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-4 pt-3 pb-1 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              activeFilter === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : events.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">No events found.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Time</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Severity</th>
                <th className="px-4 py-2.5 font-medium min-w-[160px]">Title</th>
                <th className="px-4 py-2.5 font-medium">Source</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                    {event.timestamp ? formatTime(event.timestamp) : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge className={EVENT_TYPE_COLORS[event.event_type ?? "operator_note"]}>
                      {EVENT_TYPE_LABELS[event.event_type ?? "operator_note"]}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge className={SEVERITY_COLORS[event.severity ?? "info"]}>
                      {SEVERITY_LABELS[event.severity ?? "info"]}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-foreground max-w-[220px] truncate">
                    {event.title}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {SOURCE_LABELS[event.source ?? "operator"] ?? event.source}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge className={STATUS_COLORS[event.status ?? "active"]}>
                      {STATUS_LABELS[event.status ?? "active"]}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(event.id)}
                      disabled={deleteMutation.isPending}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Delete event"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Note dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Operator Note</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief summary…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <textarea
                        rows={3}
                        placeholder="Details…"
                        className="placeholder:text-muted-foreground dark:bg-input/30 border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setAddOpen(false); form.reset() }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding…" : "Add Note"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

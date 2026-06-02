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
import { MachineActionsService } from "@/client"
import type { ActionStatus, MachineActionPublic } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"

const STATUS_LABELS: Record<ActionStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  closed: "Closed",
}

const STATUS_COLORS: Record<ActionStatus, string> = {
  open: "text-red-600",
  in_progress: "text-yellow-600",
  closed: "text-green-600",
}

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  owner: z.string().min(1, "Owner is required"),
  status: z.enum(["open", "in_progress", "closed"]),
})
type CreateForm = z.infer<typeof createSchema>

interface Props {
  machineId: string
}

export function MachineActionsSection({ machineId }: Props) {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["machine-actions", machineId],
    queryFn: () => MachineActionsService.readMachineActions({ machineId }),
  })

  const actions = data?.data ?? []

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: "", owner: "", status: "open" },
  })

  const createMutation = useMutation({
    mutationFn: (values: CreateForm) =>
      MachineActionsService.createAction({
        requestBody: {
          machine_id: machineId,
          title: values.title,
          owner: values.owner,
          status: values.status,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine-actions", machineId] })
      showSuccessToast("Action added.")
      form.reset()
      setDialogOpen(false)
    },
    onError: () => showErrorToast("Failed to add action."),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ActionStatus }) =>
      MachineActionsService.updateAction({ id, requestBody: { status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine-actions", machineId] })
    },
    onError: () => showErrorToast("Failed to update status."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => MachineActionsService.deleteAction({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine-actions", machineId] })
      showSuccessToast("Action deleted.")
    },
    onError: () => showErrorToast("Failed to delete action."),
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Follow-up Actions</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Action
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : actions.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No actions yet.</p>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">Action</th>
                <th className="px-3 py-2 text-left font-medium">Owner</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {actions.map((a: MachineActionPublic) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{a.title}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{a.owner}</td>
                  <td className="px-3 py-2">
                    <Select
                      value={a.status}
                      onValueChange={(v) =>
                        updateStatusMutation.mutate({
                          id: a.id,
                          status: v as ActionStatus,
                        })
                      }
                    >
                      <SelectTrigger className="h-7 text-xs w-32">
                        <SelectValue>
                          <span className={STATUS_COLORS[a.status as ActionStatus]}>
                            {STATUS_LABELS[a.status as ActionStatus]}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(a.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Follow-up Action</DialogTitle>
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
                      <Input {...field} placeholder="What needs to be done?" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="owner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Name or initials" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

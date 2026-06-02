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
import { MachineNotesService } from "@/client"
import type { MachineNotePublic, NoteShift, NoteCriticality } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"

const SHIFT_LABELS: Record<NoteShift, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  night: "Night",
}

const CRITICALITY_LABELS: Record<NoteCriticality, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
}

const CRITICALITY_COLORS: Record<NoteCriticality, string> = {
  low: "text-green-600",
  medium: "text-yellow-600",
  high: "text-red-600",
}

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  shift: z.enum(["morning", "afternoon", "night"]),
  impact: z.string().max(500).optional(),
  criticality: z.enum(["low", "medium", "high"]),
})
type FormValues = z.infer<typeof schema>

interface Props {
  machineId: string
}

export function MachineNotesSection({ machineId }: Props) {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["machine-notes", machineId],
    queryFn: () => MachineNotesService.readMachineNotes({ machineId }),
  })

  const notes = data?.data ?? []

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      content: "",
      shift: "morning",
      impact: "",
      criticality: "low",
    },
  })

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      MachineNotesService.createNote({
        requestBody: {
          machine_id: machineId,
          title: values.title,
          content: values.content,
          shift: values.shift,
          impact: values.impact || undefined,
          criticality: values.criticality,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine-notes", machineId] })
      showSuccessToast("Note added.")
      form.reset()
      setDialogOpen(false)
    },
    onError: () => showErrorToast("Failed to add note."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => MachineNotesService.deleteNote({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine-notes", machineId] })
      showSuccessToast("Note deleted.")
    },
    onError: () => showErrorToast("Failed to delete note."),
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Operator Notes</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Note
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No notes yet.</p>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">Title</th>
                <th className="px-3 py-2 text-left font-medium">Shift</th>
                <th className="px-3 py-2 text-left font-medium">Criticality</th>
                <th className="px-3 py-2 text-left font-medium hidden lg:table-cell">Impact</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {notes.map((n: MachineNotePublic) => (
                <tr key={n.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 max-w-[200px]">
                    <p className="font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.content}</p>
                  </td>
                  <td className="px-3 py-2 text-xs">{SHIFT_LABELS[n.shift as NoteShift]}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className={CRITICALITY_COLORS[n.criticality as NoteCriticality]}>
                      {CRITICALITY_LABELS[n.criticality as NoteCriticality]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground hidden lg:table-cell">
                    {n.impact || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(n.id)}
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
                      <Input {...field} placeholder="Short description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Details</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Full observation or note…" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="shift"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="morning">Morning</SelectItem>
                          <SelectItem value="afternoon">Afternoon</SelectItem>
                          <SelectItem value="night">Night</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="criticality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Criticality</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="impact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impact (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Production reduced by 20%" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

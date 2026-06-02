import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2 } from "lucide-react"

import { DepartmentsService, MachinesService, UnitsService } from "@/client"
import type { MachinePublic } from "@/client"
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
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/config/machines")({
  component: MachinesConfig,
  head: () => ({ meta: [{ title: "Config - Machines" }] }),
})

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  kep_tag_prefix: z.string().optional(),
  display_order: z.coerce.number().optional(),
  unit_id: z.string().min(1, "Unit is required"),
  machine_type: z.string().optional(),
})
type FormValues = z.infer<typeof formSchema>

function MachinesConfig() {
  const { user } = useAuth()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MachinePublic | null>(null)

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => DepartmentsService.readDepartments({ limit: 200 }),
  })

  const { data: unitsData } = useQuery({
    queryKey: ["units-all"],
    queryFn: () => UnitsService.readUnits({ limit: 500 }),
  })

  const { data: machinesData, isLoading } = useQuery({
    queryKey: ["machines-all"],
    queryFn: () => MachinesService.readMachines({ limit: 500 }),
  })

  const deptMap = Object.fromEntries(
    (departments ?? []).map((d) => [d.id, d.name]),
  )
  const units = unitsData?.data ?? []
  const unitMap = Object.fromEntries(units.map((u) => [u.id, u.name]))

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: { name: "", description: "", kep_tag_prefix: "", display_order: undefined, unit_id: "", machine_type: ""},
  })

  function openCreate() {
    setEditTarget(null)
    form.reset({ name: "", description: "", kep_tag_prefix: "", display_order: undefined, unit_id: "", machine_type: "" })
    setDialogOpen(true)
  }

  function openEdit(machine: MachinePublic) {
    setEditTarget(machine)
    form.reset({
      name: machine.name,
      description: machine.description ?? "",
      kep_tag_prefix: machine.kep_tag_prefix ?? "",
      display_order: machine.display_order,
      unit_id: machine.unit_id,
      machine_type: machine.machine_type ?? "",
    })
    setDialogOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const body = {
        name: values.name,
        description: values.description || null,
        kep_tag_prefix: values.kep_tag_prefix || null,
        display_order: values.display_order,
        unit_id: values.unit_id,
        machine_type: values.machine_type || null,
      }
      if (editTarget) {
        return MachinesService.updateMachineEndpoint({ id: editTarget.id, requestBody: body })
      }
      return MachinesService.createMachineEndpoint({ requestBody: body })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines-all"] })
      showSuccessToast(editTarget ? "Machine updated." : "Machine created.")
      setDialogOpen(false)
    },
    onError: () => showErrorToast("Failed to save machine."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => MachinesService.deleteMachine({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines-all"] })
      showSuccessToast("Machine deleted.")
    },
    onError: () => showErrorToast("Failed to delete machine."),
  })

  const canEdit = user?.is_superuser
  const machines = machinesData?.data ?? []

  // Group units by department for the select
  const unitsByDept = units.reduce<Record<string, typeof units>>((acc, u) => {
    const key = u.department_id
    acc[key] = [...(acc[key] ?? []), u]
    return acc
  }, {})

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Machines</h1>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Machine
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Unit</th>
                <th className="px-4 py-3 text-left font-medium">KepServer Tag Prefix</th>
                <th className="px-4 py-3 text-left font-medium">Order</th>
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {machines.map((machine) => (
                <tr key={machine.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{machine.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {machine.machine_type ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {unitMap[machine.unit_id] ?? machine.unit_id}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {machine.kep_tag_prefix ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{machine.display_order ?? "—"}</td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(machine)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(machine.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Machine" : "New Machine"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Press A1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(unitsByDept).map(([deptId, deptUnits]) => (
                          <div key={deptId}>
                            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                              {deptMap[deptId] ?? deptId}
                            </div>
                            {deptUnits.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="machine_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Machine Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Såg">Såg</SelectItem>
                        <SelectItem value="Ugn">Ugn</SelectItem>
                        <SelectItem value="Fräs">Fräs</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kep_tag_prefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KepServer Tag Prefix</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Channel1.Device1.Machine1" />
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Optional" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

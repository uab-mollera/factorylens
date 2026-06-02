import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2 } from "lucide-react"

import { DepartmentsService, UnitsService } from "@/client"
import type { UnitPublic } from "@/client"
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

export const Route = createFileRoute("/_layout/config/units")({
  component: UnitsConfig,
  head: () => ({ meta: [{ title: "Config - Units" }] }),
})

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  display_order: z.coerce.number().optional(),
  department_id: z.string().min(1, "Department is required"),
})
type FormValues = z.infer<typeof formSchema>

function UnitsConfig() {
  const { user } = useAuth()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<UnitPublic | null>(null)

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => DepartmentsService.readDepartments({ limit: 200 }),
  })

  const { data: unitsData, isLoading } = useQuery({
    queryKey: ["units-all"],
    queryFn: () => UnitsService.readUnits({ limit: 500 }),
  })

  const deptMap = Object.fromEntries(
    (departments ?? []).map((d) => [d.id, d.name]),
  )

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: { name: "", description: "", display_order: undefined, department_id: ""},
  })

  function openCreate() {
    setEditTarget(null)
    form.reset({ name: "", description: "", display_order: undefined, department_id: "" })
    setDialogOpen(true)
  }

  function openEdit(unit: UnitPublic) {
    setEditTarget(unit)
    form.reset({
      name: unit.name,
      description: unit.description ?? "",
      display_order: unit.display_order,
      department_id: unit.department_id,
    })
    setDialogOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const body = {
        name: values.name,
        description: values.description || null,
        display_order: values.display_order,
        department_id: values.department_id,
      }
      if (editTarget) {
        return UnitsService.updateUnitEndpoint({ id: editTarget.id, requestBody: body })
      }
      return UnitsService.createUnitEndpoint({ requestBody: body })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units-all"] })
      showSuccessToast(editTarget ? "Unit updated." : "Unit created.")
      setDialogOpen(false)
    },
    onError: () => showErrorToast("Failed to save unit."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => UnitsService.deleteUnit({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units-all"] })
      showSuccessToast("Unit deleted.")
    },
    onError: () => showErrorToast("Failed to delete unit."),
  })

  const canEdit = user?.is_superuser
  const units = unitsData?.data ?? []

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Units</h1>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Unit
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
                <th className="px-4 py-3 text-left font-medium">Department</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium">Order</th>
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{unit.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {deptMap[unit.department_id] ?? unit.department_id}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{unit.description ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{unit.display_order ?? "—"}</td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(unit)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(unit.id)}
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
            <DialogTitle>{editTarget ? "Edit Unit" : "New Unit"}</DialogTitle>
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
                      <Input {...field} placeholder="e.g. Assembly Line 1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="department_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(departments ?? []).map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              <FormField
                control={form.control}
                name="display_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" placeholder="0" />
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

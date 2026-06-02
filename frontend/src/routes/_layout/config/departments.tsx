import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2 } from "lucide-react"

import { DepartmentsService } from "@/client"
import type { DepartmentPublic } from "@/client"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/config/departments")({
  component: DepartmentsConfig,
  head: () => ({ meta: [{ title: "Config - Departments" }] }),
})

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  display_order: z.coerce.number().optional(),
})
type FormValues = z.infer<typeof formSchema>

function DepartmentsConfig() {
  const { user } = useAuth()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DepartmentPublic | null>(null)

  const { data: departments, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => DepartmentsService.readDepartments({ limit: 200 }),
  })

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: { name: "", description: "", display_order: undefined },
  })

  function openCreate() {
    setEditTarget(null)
    form.reset({ name: "", description: "", display_order: undefined })
    setDialogOpen(true)
  }

  function openEdit(dept: DepartmentPublic) {
    setEditTarget(dept)
    form.reset({
      name: dept.name,
      description: dept.description ?? "",
      display_order: dept.display_order,
    })
    setDialogOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const body = {
        name: values.name,
        description: values.description || null,
        display_order: values.display_order,
      }
      if (editTarget) {
        return DepartmentsService.updateDept({
          id: editTarget.id,
          requestBody: body,
        })
      }
      return DepartmentsService.createDept({ requestBody: body })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] })
      showSuccessToast(editTarget ? "Department updated." : "Department created.")
      setDialogOpen(false)
    },
    onError: () => showErrorToast("Failed to save department."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => DepartmentsService.deleteDept({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] })
      showSuccessToast("Department deleted.")
    },
    onError: () => showErrorToast("Failed to delete department."),
  })

  const canEdit = user?.is_superuser

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Departments</h1>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Department
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
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium">Order</th>
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {(departments ?? []).map((dept) => (
                <tr key={dept.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{dept.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{dept.description ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{dept.display_order ?? "—"}</td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(dept)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(dept.id)}
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
            <DialogTitle>{editTarget ? "Edit Department" : "New Department"}</DialogTitle>
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
                      <Input {...field} placeholder="e.g. Production" />
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

import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react"

import {
  LossCodeCategoriesService,
  LossCodesService,
} from "@/client"
import type {
  LossCodeCategoryInHierarchy,
  LossCodeInHierarchy,
  LossCodeTypeWithHierarchy,
} from "@/client"
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

export const Route = createFileRoute("/_layout/config/loss-codes")({
  component: LossCodesConfig,
  head: () => ({ meta: [{ title: "Config - Loss Codes" }] }),
})

// ---------- Category form ----------
const catSchema = z.object({ name: z.string().min(1, "Name is required") })
type CatForm = z.infer<typeof catSchema>

// ---------- Loss-code form ----------
const lcSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
})
type LcForm = z.infer<typeof lcSchema>

// ---------- Main component ----------
function LossCodesConfig() {
  const { user } = useAuth()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()
  const canEdit = !!user?.is_superuser

  const { data: hierarchy = [], isLoading } = useQuery({
    queryKey: ["loss-code-hierarchy"],
    queryFn: () => LossCodesService.readLossCodeHierarchy(),
  })

  // Expanded state per type key
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const toggle = (key: string) =>
    setExpanded((p) => ({ ...p, [key]: !p[key] }))

  // ---- Category dialog state ----
  const [catDialog, setCatDialog] = useState<{
    open: boolean
    typeId: string
    edit: LossCodeCategoryInHierarchy | null
  }>({ open: false, typeId: "", edit: null })

  const catForm = useForm<CatForm>({ resolver: zodResolver(catSchema), defaultValues: { name: "" } })

  function openCatCreate(typeId: string) {
    catForm.reset({ name: "" })
    setCatDialog({ open: true, typeId, edit: null })
  }
  function openCatEdit(typeId: string, cat: LossCodeCategoryInHierarchy) {
    catForm.reset({ name: cat.name })
    setCatDialog({ open: true, typeId, edit: cat })
  }

  const catMutation = useMutation({
    mutationFn: (values: CatForm) => {
      if (catDialog.edit) {
        return LossCodeCategoriesService.updateCategory({
          id: catDialog.edit.id,
          requestBody: { name: values.name },
        })
      }
      return LossCodeCategoriesService.createCategory({
        requestBody: { name: values.name, type_id: catDialog.typeId },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loss-code-hierarchy"] })
      showSuccessToast(catDialog.edit ? "Category updated." : "Category created.")
      setCatDialog((p) => ({ ...p, open: false }))
    },
    onError: () => showErrorToast("Failed to save category."),
  })

  const catDeleteMutation = useMutation({
    mutationFn: (id: string) => LossCodeCategoriesService.deleteCategory({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loss-code-hierarchy"] })
      showSuccessToast("Category deleted.")
    },
    onError: () => showErrorToast("Failed to delete category."),
  })

  // ---- Loss-code dialog state ----
  const [lcDialog, setLcDialog] = useState<{
    open: boolean
    categoryId: string
    edit: LossCodeInHierarchy | null
  }>({ open: false, categoryId: "", edit: null })

  const lcForm = useForm<LcForm>({ resolver: zodResolver(lcSchema), defaultValues: { code: "", name: "" } })

  function openLcCreate(categoryId: string) {
    lcForm.reset({ code: "", name: "" })
    setLcDialog({ open: true, categoryId, edit: null })
  }
  function openLcEdit(categoryId: string, lc: LossCodeInHierarchy) {
    lcForm.reset({ code: lc.code, name: lc.name })
    setLcDialog({ open: true, categoryId, edit: lc })
  }

  const lcMutation = useMutation({
    mutationFn: (values: LcForm) => {
      if (lcDialog.edit) {
        return LossCodesService.updateLossCodeEndpoint({
          id: lcDialog.edit.id,
          requestBody: { code: values.code, name: values.name },
        })
      }
      return LossCodesService.createLossCodeEndpoint({
        requestBody: { code: values.code, name: values.name, category_id: lcDialog.categoryId },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loss-code-hierarchy"] })
      showSuccessToast(lcDialog.edit ? "Loss code updated." : "Loss code created.")
      setLcDialog((p) => ({ ...p, open: false }))
    },
    onError: () => showErrorToast("Failed to save loss code."),
  })

  const lcDeleteMutation = useMutation({
    mutationFn: (id: string) => LossCodesService.deleteLossCode({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loss-code-hierarchy"] })
      showSuccessToast("Loss code deleted.")
    },
    onError: () => showErrorToast("Failed to delete loss code."),
  })

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Loss Codes</h1>
      <p className="text-sm text-muted-foreground">
        Loss codes are organised by Type → Category → Reason code. Types are fixed; categories and codes are user-managed.
      </p>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-3">
          {hierarchy.map((type: LossCodeTypeWithHierarchy) => {
            const isOpen = expanded[type.key] !== false // open by default
            return (
              <div key={type.id} className="rounded-xl border overflow-hidden">
                {/* Type header */}
                <button
                  type="button"
                  onClick={() => toggle(type.key)}
                  className="w-full flex items-center justify-between px-4 py-3 font-semibold text-sm hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-block h-3 w-3 rounded-full border"
                      style={{ backgroundColor: type.color }}
                    />
                    <span>{type.label}</span>
                    <span className="text-xs font-normal text-muted-foreground font-mono">
                      ({type.key})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          openCatCreate(type.id)
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Category
                      </Button>
                    )}
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Categories */}
                {isOpen && (
                  <div className="border-t divide-y">
                    {(type.categories ?? []).length === 0 && (
                      <p className="px-6 py-3 text-sm text-muted-foreground italic">
                        No categories — add one above.
                      </p>
                    )}
                    {(type.categories ?? []).map((cat: LossCodeCategoryInHierarchy) => (
                      <div key={cat.id} className="bg-muted/20">
                        {/* Category row */}
                        <div className="flex items-center justify-between px-6 py-2">
                          <span className="text-sm font-medium">{cat.name}</span>
                          <div className="flex items-center gap-1">
                            {canEdit && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => openLcCreate(cat.id)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Code
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => openCatEdit(type.id, cat)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => catDeleteMutation.mutate(cat.id)}
                                  disabled={catDeleteMutation.isPending}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Loss codes table */}
                        {(cat.loss_codes ?? []).length > 0 && (
                          <table className="w-full text-sm border-t">
                            <thead>
                              <tr className="bg-muted/40">
                                <th className="px-8 py-2 text-left font-medium text-xs text-muted-foreground w-24">
                                  Code
                                </th>
                                <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">
                                  Name
                                </th>
                                {canEdit && <th className="px-3 py-2 w-16" />}
                              </tr>
                            </thead>
                            <tbody>
                              {(cat.loss_codes ?? []).map((lc: LossCodeInHierarchy) => (
                                <tr key={lc.id} className="border-t hover:bg-muted/30">
                                  <td className="px-8 py-2 font-mono font-medium text-xs">
                                    {lc.code}
                                  </td>
                                  <td className="px-3 py-2">{lc.name}</td>
                                  {canEdit && (
                                    <td className="px-3 py-2">
                                      <div className="flex gap-1 justify-end">
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-6 w-6"
                                          onClick={() => openLcEdit(cat.id, lc)}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-6 w-6 text-destructive hover:text-destructive"
                                          onClick={() => lcDeleteMutation.mutate(lc.id)}
                                          disabled={lcDeleteMutation.isPending}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {(cat.loss_codes ?? []).length === 0 && (
                          <p className="px-8 py-2 text-xs text-muted-foreground italic border-t">
                            No codes in this category.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Category dialog */}
      <Dialog open={catDialog.open} onOpenChange={(o) => setCatDialog((p) => ({ ...p, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{catDialog.edit ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <Form {...catForm}>
            <form onSubmit={catForm.handleSubmit((v) => catMutation.mutate(v))} className="space-y-4">
              <FormField
                control={catForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Planned Maintenance" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCatDialog((p) => ({ ...p, open: false }))}>
                  Cancel
                </Button>
                <Button type="submit" disabled={catMutation.isPending}>
                  {catMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Loss-code dialog */}
      <Dialog open={lcDialog.open} onOpenChange={(o) => setLcDialog((p) => ({ ...p, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lcDialog.edit ? "Edit Loss Code" : "New Loss Code"}</DialogTitle>
          </DialogHeader>
          <Form {...lcForm}>
            <form onSubmit={lcForm.handleSubmit((v) => lcMutation.mutate(v))} className="space-y-4">
              <FormField
                control={lcForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. PM-01" className="font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={lcForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Planned Maintenance" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setLcDialog((p) => ({ ...p, open: false }))}>
                  Cancel
                </Button>
                <Button type="submit" disabled={lcMutation.isPending}>
                  {lcMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}


import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { toast } from "sonner"

import { ViewsService } from "@/client"
import { ViewTabBar } from "@/components/hierarchy/ViewTabBar"
import { AddViewModal } from "@/components/hierarchy/AddViewModal"
import { DeleteViewDialog } from "@/components/hierarchy/DeleteViewDialog"
import { renderViewTemplate } from "@/utils/viewTemplates"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
  component: HomePage,
  head: () => ({
    meta: [{ title: "FactoryLens - Home" }],
  }),
})

function HomePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeViewId, setActiveViewId] = useState<string | undefined>()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [deleteViewId, setDeleteViewId] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ViewsService.deleteView({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["views", "home", null] })
      if (activeViewId === deleteViewId) setActiveViewId(undefined)
      setDeleteViewId(null)
      toast.success("View deleted")
    },
  })

  const { data: viewsData } = useQuery({
    queryKey: ["views", "home", null],
    queryFn: () => ViewsService.readViews({ level: "home", limit: 50 }),
  })

  const views = viewsData?.data ?? []

  // Pin the active view as soon as views load so that re-fetches (after add/delete)
  // don't change the active view due to sort-order shifts.
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

  const viewType = activeView?.view_type ?? "tile_grid"

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
      <div className="flex-1 overflow-auto">
        {renderViewTemplate(viewType, { entityId: "", level: "home", viewId: activeView?.id })}
      </div>
      <AddViewModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        level="home"
        entityId={null}
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

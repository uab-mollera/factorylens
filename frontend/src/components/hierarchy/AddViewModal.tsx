import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { ViewsService } from "@/client"
import type { HierarchyLevel } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { TEMPLATE_REGISTRY } from "@/utils/viewTemplates"

interface AddViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  level: HierarchyLevel
  /** null for home level (no specific entity) */
  entityId: string | null
  onViewAdded?: (viewId: string) => void
}

export function AddViewModal({
  open,
  onOpenChange,
  level,
  entityId,
  onViewAdded,
}: AddViewModalProps) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const [name, setName] = useState("")
  const [viewType, setViewType] = useState("mosaic_board")

  const { mutate: createView, isPending } = useMutation({
    mutationFn: () =>
      ViewsService.createViewEndpoint({
        requestBody: {
          name: name.trim(),
          level,
          view_type: viewType,
          entity_id: entityId,
          display_order: 0,
        },
      }),
    onSuccess: (newView) => {
      queryClient.invalidateQueries({ queryKey: ["views", level, entityId] })
      showSuccessToast(`View "${newView.name}" created.`)
      onViewAdded?.(newView.id)
      onOpenChange(false)
      setName("")
      setViewType("tile_grid")
    },
    onError: () => showErrorToast("Failed to create view."),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    createView()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add View</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="view-name">Name</Label>
            <Input
              id="view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Overview"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="view-template">Template</Label>
            <Select value={viewType} onValueChange={setViewType}>
              <SelectTrigger id="view-template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TEMPLATE_REGISTRY)
                  .filter(([key]) => key !== "tile_grid")
                  .map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <div className="font-medium">{info.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {info.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending ? "Creating…" : "Create View"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

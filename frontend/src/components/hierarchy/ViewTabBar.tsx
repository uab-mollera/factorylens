import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"
import type { HierarchyViewPublic } from "@/client"

interface ViewTabBarProps {
  views: HierarchyViewPublic[]
  activeViewId?: string
  onViewChange?: (id: string) => void
  onAddView?: () => void
  /** If true the Add button is shown (superusers only) */
  canAdd?: boolean
  /** If true an × delete button is shown on non-default tabs (superusers only) */
  canDelete?: boolean
  onDeleteView?: (id: string) => void
}

export function ViewTabBar({
  views,
  activeViewId,
  onViewChange,
  onAddView,
  canAdd = false,
  canDelete = false,
  onDeleteView,
}: ViewTabBarProps) {
  const defaultView = activeViewId ?? views[0]?.id ?? "__none"

  return (
    <div className="flex items-center border-b px-4 bg-background shrink-0">
      <Tabs
        value={defaultView}
        onValueChange={onViewChange}
        className="flex-1"
      >
        <TabsList className="h-10 rounded-none bg-transparent border-0 p-0 gap-0">
          {views.map((v) => (
            <TabsTrigger
              key={v.id}
              value={v.id}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-10 px-4 text-sm"
            >
              <span className="flex items-center gap-1.5">
                {v.name}
                {canDelete && !v.is_default && (
                  <span
                    role="button"
                    tabIndex={0}
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                    aria-label={`Delete view ${v.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteView?.(v.id)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation()
                        onDeleteView?.(v.id)
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </span>
            </TabsTrigger>
          ))}
          {views.length === 0 && (
            <span className="px-4 h-10 flex items-center text-sm text-muted-foreground italic">
              No views — add one below
            </span>
          )}
        </TabsList>
      </Tabs>
      {canAdd && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onAddView}
          aria-label="Add view"
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

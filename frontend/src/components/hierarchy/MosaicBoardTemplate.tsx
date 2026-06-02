import { useEffect, useMemo, useRef, useState } from "react"
import {
  createBalancedTreeFromLeaves,
  Mosaic,
  type MosaicBranch,
  type MosaicNode,
  MosaicWindow,
} from "react-mosaic-component"
import "react-mosaic-component/react-mosaic-component.css"
import { Maximize2, Plus, Settings2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ── Types ────────────────────────────────────────────────────────────────────

type PanelConfig = {
  id: string
  title: string
  url: string
}

type StoredMosaicState = {
  layout: MosaicNode<string> | null
  panels: Record<string, PanelConfig>
  counter: number
}

interface MosaicBoardTemplateProps {
  viewId: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_PANEL_URL = "https://example.com"

// ── Component ────────────────────────────────────────────────────────────────

export function MosaicBoardTemplate({ viewId }: MosaicBoardTemplateProps) {
  const storageKey = `mosaic-view-${viewId}`

  const [panels, setPanels] = useState<Record<string, PanelConfig>>({})
  const [layout, setLayout] = useState<MosaicNode<string> | null>(null)
  const [isConfigMode, setIsConfigMode] = useState(false)
  const [hasHydrated, setHasHydrated] = useState(false)
  const panelCounterRef = useRef(0)
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null)
  const [panelUrlInput, setPanelUrlInput] = useState("")
  const [panelTitleInput, setPanelTitleInput] = useState("")
  const [expandedPanelId, setExpandedPanelId] = useState<string | null>(null)
  const [failedPanels, setFailedPanels] = useState<Set<string>>(new Set())
  const layoutDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load from localStorage on mount / when viewId changes
  useEffect(() => {
    setHasHydrated(false)
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as StoredMosaicState
        if (parsed && typeof parsed === "object") {
          // Sanitize any localhost URLs saved from a previous testing session
          const hostname = window.location.hostname
          const sanitisedPanels = Object.fromEntries(
            Object.entries(parsed.panels ?? {}).map(([k, p]) => [
              k,
              {
                ...p,
                url: p.url.replace(
                  /^(https?:\/\/)localhost\b/,
                  `$1${hostname}`,
                ),
              },
            ]),
          )
          setPanels(sanitisedPanels)
          setLayout(parsed.layout ?? null)
          panelCounterRef.current =
            parsed.counter ?? Object.keys(sanitisedPanels).length
          setHasHydrated(true)
          return
        }
      }
    } catch (e) {
      console.warn("Failed to read mosaic state", e)
    }
    setPanels({})
    setLayout(null)
    panelCounterRef.current = 0
    setHasHydrated(true)
  }, [storageKey])

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (!hasHydrated) return
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ layout, panels, counter: panelCounterRef.current }),
      )
    } catch (e) {
      console.warn("Failed to save mosaic state", e)
    }
  }, [layout, panels, storageKey, hasHydrated])

  // Rebuild layout if panels exist but layout was lost
  useEffect(() => {
    if (!layout && Object.keys(panels).length > 0) {
      setLayout(createBalancedTreeFromLeaves(Object.keys(panels)))
    }
  }, [layout, panels])

  const handleLayoutChange = (nextLayout: MosaicNode<string> | null) => {
    if (layoutDebounceTimer.current) clearTimeout(layoutDebounceTimer.current)
    layoutDebounceTimer.current = setTimeout(() => setLayout(nextLayout), 150)
  }

  const openPanelSettings = (panelId: string) => {
    setEditingPanelId(panelId)
    setPanelUrlInput(panels[panelId]?.url ?? "")
    setPanelTitleInput(panels[panelId]?.title ?? panelId)
  }

  const closePanelSettings = () => {
    setEditingPanelId(null)
    setPanelUrlInput("")
    setPanelTitleInput("")
  }

  const handleSavePanelUrl = () => {
    let trimmedUrl = panelUrlInput.trim()
    const trimmedTitle = panelTitleInput.trim()
    if (!editingPanelId || !trimmedUrl) {
      closePanelSettings()
      return
    }
    // Add http:// if no protocol is specified
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      trimmedUrl = `http://${trimmedUrl}`
    }
    // Replace localhost with current hostname so saved URLs work from any device
    const normalised = trimmedUrl.replace(
      /^(https?:\/\/)localhost\b/,
      `$1${window.location.hostname}`,
    )
    setPanels((prev) => {
      const next = {
        ...prev,
        [editingPanelId]: {
          ...(prev[editingPanelId] ?? {
            id: editingPanelId,
            title: trimmedTitle || editingPanelId,
            url: normalised,
          }),
          title: trimmedTitle || prev[editingPanelId]?.title || editingPanelId,
          url: normalised,
        },
      }
      return next
    })
    setFailedPanels((prev) => {
      const next = new Set(prev)
      next.delete(editingPanelId)
      return next
    })
    closePanelSettings()
  }

  const handleAddPanel = () => {
    panelCounterRef.current += 1
    const nextId = `Panel-${panelCounterRef.current}`
    setPanels((prev) => {
      const next = {
        ...prev,
        [nextId]: { id: nextId, title: nextId, url: DEFAULT_PANEL_URL },
      }
      setLayout(createBalancedTreeFromLeaves(Object.keys(next)))
      return next
    })
  }

  const handleRemovePanel = (panelId: string) => {
    setPanels((prev) => {
      if (!(panelId in prev)) return prev
      const next = { ...prev }
      delete next[panelId]
      const remaining = Object.keys(next)
      setLayout(
        remaining.length === 0 ? null : createBalancedTreeFromLeaves(remaining),
      )
      if (editingPanelId === panelId) closePanelSettings()
      return next
    })
  }

  const renderTile = useMemo(
    () => (id: string, path: MosaicBranch[]) => {
      const panel = panels[id] ?? { id, title: id, url: DEFAULT_PANEL_URL }

      const renderToolbar = () => {
        if (!isConfigMode) return null
        return (
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b bg-white gap-2 shrink-0">
            <span className="text-sm font-semibold truncate">{panel.title}</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => openPanelSettings(id)}
                className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-gray-100 text-gray-600"
                aria-label={`Configure ${panel.title}`}
              >
                <Settings2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleRemovePanel(id)}
                className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-red-50 text-red-500"
                aria-label={`Remove ${panel.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      }

      return (
        <MosaicWindow<string>
          key={id}
          path={path}
          draggable={isConfigMode}
          className={!isConfigMode ? "mosaic-window--hide-toolbar" : undefined}
          title={isConfigMode ? panel.title : ""}
          renderToolbar={renderToolbar}
        >
          <div className="relative w-full h-full bg-white">
            {isConfigMode ? (
              <div className="flex items-center justify-center w-full h-full bg-gray-50 text-gray-600 text-sm font-medium">
                {panel.title || "Panel"}
              </div>
            ) : (
              <>
                {failedPanels.has(id) ? (
                  <div className="flex flex-col items-center justify-center w-full h-full bg-gray-50 text-gray-500 text-sm gap-2 px-4 text-center">
                    <span>Unable to load panel</span>
                    <span className="text-xs text-muted-foreground break-all">{panel.url}</span>
                    <button
                      type="button"
                      className="text-xs underline mt-1"
                      onClick={() => {
                        setFailedPanels((prev) => {
                          const next = new Set(prev)
                          next.delete(id)
                          return next
                        })
                      }}
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <iframe
                    key={panel.url}
                    src={panel.url || "about:blank"}
                    title={panel.title || "Panel"}
                    className="w-full h-full border-0 bg-white"
                    onError={() =>
                      setFailedPanels((prev) => new Set(prev).add(id))
                    }
                  />
                )}
                <button
                  type="button"
                  onClick={() => setExpandedPanelId(id)}
                  className="absolute top-2 right-2 inline-flex items-center justify-center w-8 h-8 rounded bg-white/90 shadow hover:bg-white z-10 text-gray-700"
                  aria-label={`Expand ${panel.title}`}
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </MosaicWindow>
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [panels, isConfigMode],
  )

  const hasPanels = Object.keys(panels).length > 0 && layout !== null

  return (
    <>
      <style>{`
        .mosaic-window--hide-toolbar .mosaic-window-toolbar { display: none !important; }
        .mosaic-window--hide-toolbar .mosaic-window-body {
          position: absolute; top: 0 !important; right: 0; bottom: 0; left: 0;
          height: 100% !important;
          padding-top: 0 !important; background: transparent !important;
        }
        .mosaic-window--hide-toolbar .mosaic-window-body-overlay { display: none !important; }
        .mosaic-window--hide-toolbar .drop-target-container { top: 0 !important; }
        .mosaic-board--view .mosaic-root { top: 0 !important; right: 0 !important; bottom: 0 !important; left: 0 !important; }
        .mosaic-board--view .mosaic-tile { margin: 0 !important; }
        .mosaic-board--view .mosaic-split { display: none !important; }
        .mosaic-tile--dragging iframe { pointer-events: none; }
      `}</style>

      <div
        className={`flex flex-col w-full h-full overflow-hidden ${!isConfigMode ? "mosaic-board--view" : ""}`}
      >
        {/* Toolbar strip */}
        <div className="flex items-center justify-end gap-1.5 px-3 py-1.5 border-b bg-background shrink-0">
          {isConfigMode && (
            <Button size="sm" variant="outline" onClick={handleAddPanel} className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              Add Panel
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsConfigMode((p) => !p)}
          >
            {isConfigMode ? "Done" : "Configure"}
          </Button>
        </div>

        {/* Mosaic area */}
        <div className="flex-1 overflow-hidden min-h-0 relative">
          {hasPanels ? (
            <div className="w-full h-full">
              <Mosaic<string>
                renderTile={renderTile}
                value={layout}
                onChange={isConfigMode ? handleLayoutChange : () => {}}
                resize={
                  isConfigMode
                    ? { minimumPaneSizePercentage: 10 }
                    : "DISABLED"
                }
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <p className="text-sm">No panels yet.</p>
              {isConfigMode ? (
                <Button size="sm" onClick={handleAddPanel} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Add your first panel
                </Button>
              ) : (
                <p className="text-sm">Click Configure to add panels.</p>
              )}
            </div>
          )}
        </div>

        {/* Edit panel URL dialog */}
        <Dialog
          open={editingPanelId !== null}
          onOpenChange={(open) => {
            if (!open) closePanelSettings()
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Panel</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="panel-title">Panel Title</Label>
                <Input
                  id="panel-title"
                  value={panelTitleInput}
                  onChange={(e) => setPanelTitleInput(e.target.value)}
                  placeholder="My Dashboard"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSavePanelUrl()
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="panel-url">URL</Label>
                <p className="text-xs text-muted-foreground">
                  Protocol (http://) will be added automatically if omitted.
                </p>
                <Input
                  id="panel-url"
                  value={panelUrlInput}
                  onChange={(e) => setPanelUrlInput(e.target.value)}
                  placeholder="192.168.1.1:3000 or https://example.com"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSavePanelUrl()
                  }}
                />
                {/^https?:\/\/localhost\b/.test(panelUrlInput.trim()) && (
                  <p className="text-xs text-amber-600">
                    <strong>localhost</strong> will be replaced with{" "}
                    <strong>{window.location.hostname}</strong> so the panel
                    works from any device on the network.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closePanelSettings}>
                Cancel
              </Button>
              <Button onClick={handleSavePanelUrl}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Expanded panel dialog */}
        {expandedPanelId && panels[expandedPanelId] && (
          <Dialog
            open
            onOpenChange={(open) => {
              if (!open) setExpandedPanelId(null)
            }}
          >
            <DialogContent
              className="max-w-[95vw] p-0 overflow-hidden"
              style={{ maxHeight: "90vh" }}
            >
              <DialogHeader className="px-4 py-3 border-b">
                <DialogTitle>{panels[expandedPanelId].title}</DialogTitle>
              </DialogHeader>
              <div style={{ height: "calc(90vh - 80px)" }}>
                <iframe
                  src={panels[expandedPanelId].url || "about:blank"}
                  title={panels[expandedPanelId].title}
                  className="w-full h-full border-0"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </>
  )
}
